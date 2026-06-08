import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { Injectable, Logger } from '@nestjs/common';
import { ExecutionPlan, PlannedStep } from '@conductor/shared-types';
import { PLANNER_SYSTEM_PROMPT } from './prompts/planner.prompt';

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  private createModel(): ChatGoogleGenerativeAI {
    const apiKey = process.env['GOOGLE_GENERATIVE_AI_API_KEY'];
    if (!apiKey) {
      throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not configured');
    }
    return new ChatGoogleGenerativeAI({
      model: 'gemini-2.5-flash',
      apiKey,
      temperature: 0.2,
    });
  }

  async planSteps(goal: string, taskType?: string): Promise<PlannedStep[]> {
    try {
      const plan = await this.planExecution(goal, taskType);
      return plan.steps
        .filter(
          (s): s is Extract<
            ExecutionPlan['steps'][number],
            { type: 'navigate' | 'extract' | 'summarise' }
          > => s.type === 'navigate' || s.type === 'extract' || s.type === 'summarise'
        )
        .map((s, i): PlannedStep => {
          if (s.type === 'navigate') {
            return {
              stepNumber: s.stepNumber,
              action: 'navigate',
              target: s.url,
              description: s.description,
              expectedOutput: 'Page loaded',
            };
          }
          if (s.type === 'extract') {
            return {
              stepNumber: s.stepNumber,
              action: 'extract',
              target: s.selectorHint ?? '',
              description: s.description,
              expectedOutput: 'Extracted items',
            };
          }
          return {
            stepNumber: s.stepNumber,
            action: 'summarise',
            target: s.text,
            description: s.description,
            expectedOutput: 'Summary',
          };
        })
        .map((step, idx) => ({ ...step, stepNumber: step.stepNumber || idx + 1 }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to plan steps: ${message}`);
      throw new Error(`Step planning failed: ${message}`);
    }
  }

  async planExecution(goal: string, taskType?: string): Promise<ExecutionPlan> {
    const normalizedTaskType = (taskType ?? 'general').toLowerCase();

    if (normalizedTaskType === 'health-check') {
      const urls = goal
        .split(/[,\n]/)
        .map((u) => u.trim())
        .filter((u) => u.length > 0)
        .map((u) => (u.startsWith('http') ? u : `https://${u}`));

      return {
        version: 2,
        site: 'health-check',
        targetUrl: urls[0] ?? 'about:blank',
        steps: urls.map((url, i) => ({
          type: 'healthCheck',
          stepNumber: i + 1,
          url,
          description: `Check ${new URL(url).hostname}`,
        })),
      };
    }

    if (normalizedTaskType === 'web-search') {
      const query = goal.replace(/^search\s+for\s+/i, '').trim() || goal;
      return {
        version: 2,
        site: 'google',
        targetUrl: 'https://www.google.com',
        searchQuery: query,
        steps: [
          {
            type: 'search',
            stepNumber: 1,
            query,
            engine: 'google',
            description: 'Search Google',
          },
          {
            type: 'extract',
            stepNumber: 2,
            prompt: `Extract the top 5 results for: ${query}`,
            limit: 5,
            selectorHint: 'div.g',
            description: 'Extract results',
          },
          {
            type: 'summarise',
            stepNumber: 3,
            text: `Summarise search results for: ${query}`,
            description: 'Summarise results',
          },
        ],
      };
    }

    try {
      const model = this.createModel();
      const response = await model.invoke([
        { role: 'system', content: PLANNER_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Goal: ${goal}\nTask type: ${taskType ?? 'general'}`,
        },
      ]);

      const content =
        typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content);

      const cleaned = content
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

      const parsed: unknown = JSON.parse(cleaned);
      return this.validateExecutionPlan(parsed);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to plan execution: ${message}`);
      throw new Error(`Execution planning failed: ${message}`);
    }
  }

  async summarise(text: string): Promise<string> {
    try {
      const model = this.createModel();
      const response = await model.invoke([
        {
          role: 'user',
          content: `Summarise the following content in 3-5 bullet points:\n\n${text.slice(0, 12000)}`,
        },
      ]);
      return typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Summarisation failed: ${message}`);
      throw new Error(`Summarisation failed: ${message}`);
    }
  }

  async generateRaw(prompt: string): Promise<string> {
    try {
      const model = this.createModel();
      const response = await model.invoke([{ role: 'user', content: prompt }]);
      return typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Raw generation failed: ${message}`);
      throw new Error(`Raw generation failed: ${message}`);
    }
  }

  private validateSteps(data: unknown): PlannedStep[] {
    if (!Array.isArray(data)) {
      throw new Error('Planner response is not an array');
    }

    const validActions = new Set([
      'navigate',
      'extract',
      'search',
      'screenshot',
      'summarise',
    ]);

    return data.map((item, index) => {
      if (!item || typeof item !== 'object') {
        throw new Error(`Invalid step at index ${index}`);
      }
      const step = item as Record<string, unknown>;
      const action = String(step['action'] ?? '');
      if (!validActions.has(action)) {
        throw new Error(`Invalid action "${action}" at step ${index + 1}`);
      }
      return {
        stepNumber: Number(step['stepNumber'] ?? index + 1),
        action: action as PlannedStep['action'],
        target: String(step['target'] ?? ''),
        description: String(step['description'] ?? ''),
        expectedOutput: String(step['expectedOutput'] ?? ''),
      };
    });
  }

  private validateExecutionPlan(data: unknown): ExecutionPlan {
    if (!data || typeof data !== 'object') {
      throw new Error('Planner response is not an object');
    }
    const plan = data as Record<string, unknown>;
    const version = Number(plan['version']);
    if (version !== 2) {
      throw new Error(`Unsupported plan version: ${String(plan['version'])}`);
    }
    const steps = plan['steps'];
    if (!Array.isArray(steps)) {
      throw new Error('Planner response steps is not an array');
    }

    const site = String(plan['site'] ?? 'generic');
    const targetUrl = String(plan['targetUrl'] ?? '');
    const searchQuery =
      typeof plan['searchQuery'] === 'string' ? plan['searchQuery'] : undefined;
    const extractLimit =
      typeof plan['extractLimit'] === 'number' && Number.isFinite(plan['extractLimit'])
        ? plan['extractLimit']
        : undefined;

    const normalizedSteps = steps.map((raw, idx) => {
      if (!raw || typeof raw !== 'object') {
        throw new Error(`Invalid step at index ${idx}`);
      }
      const step = raw as Record<string, unknown>;
      const type = String(step['type'] ?? '');
      const stepNumber = Number(step['stepNumber'] ?? idx + 1);
      const description = String(step['description'] ?? '');

      if (!Number.isFinite(stepNumber) || stepNumber < 1) {
        throw new Error(`Invalid stepNumber at index ${idx}`);
      }

      switch (type) {
        case 'navigate':
          return {
            type: 'navigate',
            stepNumber,
            url: String(step['url'] ?? ''),
            description,
          } as const;
        case 'search':
          return {
            type: 'search',
            stepNumber,
            query: String(step['query'] ?? ''),
            engine:
              String(step['engine'] ?? '').toLowerCase() === 'google'
                ? ('google' as const)
                : undefined,
            description,
          } as const;
        case 'waitForSelector':
          return {
            type: 'waitForSelector',
            stepNumber,
            selector: String(step['selector'] ?? ''),
            timeoutMs:
              typeof step['timeoutMs'] === 'number' ? (step['timeoutMs'] as number) : undefined,
            description,
          } as const;
        case 'type':
          return {
            type: 'type',
            stepNumber,
            selector: String(step['selector'] ?? ''),
            text: String(step['text'] ?? ''),
            submit: Boolean(step['submit'] ?? false),
            description,
          } as const;
        case 'click':
          return {
            type: 'click',
            stepNumber,
            selector: String(step['selector'] ?? ''),
            description,
          } as const;
        case 'scroll':
          return {
            type: 'scroll',
            stepNumber,
            mode: (String(step['mode'] ?? 'page') === 'smooth-bottom'
              ? 'smooth-bottom'
              : 'page') as 'smooth-bottom' | 'page',
            scrollY:
              typeof step['scrollY'] === 'number' ? (step['scrollY'] as number) : undefined,
            description,
          } as const;
        case 'extract':
          return {
            type: 'extract',
            stepNumber,
            prompt: String(step['prompt'] ?? ''),
            limit:
              typeof step['limit'] === 'number' ? (step['limit'] as number) : undefined,
            selectorHint:
              typeof step['selectorHint'] === 'string'
                ? (step['selectorHint'] as string)
                : undefined,
            description,
          } as const;
        case 'highlight':
          return {
            type: 'highlight',
            stepNumber,
            selector: String(step['selector'] ?? ''),
            index: Number(step['index'] ?? 0),
            message:
              typeof step['message'] === 'string' ? (step['message'] as string) : undefined,
            description,
          } as const;
        case 'summarise':
          return {
            type: 'summarise',
            stepNumber,
            text: String(step['text'] ?? ''),
            description,
          } as const;
        case 'healthCheck':
          return {
            type: 'healthCheck',
            stepNumber,
            url: String(step['url'] ?? ''),
            description,
          } as const;
        default:
          throw new Error(`Invalid step type "${type}" at step ${idx + 1}`);
      }
    });

    normalizedSteps.sort((a, b) => a.stepNumber - b.stepNumber);
    for (let i = 0; i < normalizedSteps.length; i++) {
      if (normalizedSteps[i]!.stepNumber !== i + 1) {
        throw new Error('Step numbers must be contiguous starting at 1');
      }
    }

    return {
      version: 2,
      site,
      targetUrl,
      searchQuery,
      extractLimit,
      steps: normalizedSteps as unknown as ExecutionPlan['steps'],
    };
  }
}
