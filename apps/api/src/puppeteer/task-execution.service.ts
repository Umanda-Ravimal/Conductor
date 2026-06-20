import { Injectable, Logger } from '@nestjs/common';
import type {
  ExecutionPlan,
  ExecutionPlanStep,
  TaskHighlightEvent,
} from '@conductor/shared-types';
import { AgentService } from '../agent/agent.service';
import { EventsGateway } from '../gateway/events.gateway';
import { BrowserSessionService } from './browser-session.service';

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

@Injectable()
export class TaskExecutionService {
  private readonly logger = new Logger(TaskExecutionService.name);
  private frameIndex = 0;

  constructor(
    private readonly browserSession: BrowserSessionService,
    private readonly agentService: AgentService,
    private readonly eventsGateway: EventsGateway
  ) {}

  async runPlan(taskId: string, goal: string, plan: ExecutionPlan): Promise<unknown> {
    let tabId: string | null = null;
    let frameTimer: NodeJS.Timeout | null = null;
    this.frameIndex = 0;

    const startFrameStream = () => {
      if (!tabId) return;
      if (frameTimer) clearInterval(frameTimer);
      frameTimer = setInterval(async () => {
        try {
          if (!tabId) return;
          const screenshotB64 = await this.browserSession.getTabScreenshotJpegB64(tabId);
          this.eventsGateway.emitFrame({
            taskId,
            frameIndex: this.frameIndex++,
            screenshotB64,
            timestamp: new Date().toISOString(),
          });
        } catch {
          // ignore transient frame errors; steps will still drive the task
        }
      }, 300);
    };

    try {
      // Always start from a tab (about:blank), navigate steps will move it.
      const tab = await this.browserSession.createTab('about:blank');
      tabId = tab.id;
      startFrameStream();

      const extractedItems: unknown[] = [];
      const stepOutputs: Array<{ stepNumber: number; type: string; output: unknown }> = [];

      for (const step of plan.steps) {
        this.eventsGateway.emitStep({
          taskId,
          stepNumber: step.stepNumber,
          message: step.description,
          status: 'INFO',
        });

        const output = await this.executeStep(taskId, goal, plan, tabId, step);
        stepOutputs.push({ stepNumber: step.stepNumber, type: step.type, output });

        if (step.type === 'extract' && Array.isArray(output)) {
          extractedItems.push(...output);
        }
      }

      return {
        plan,
        extractedItems,
        stepOutputs,
      };
    } finally {
      if (frameTimer) clearInterval(frameTimer);
      if (tabId) {
        await this.browserSession.closeTab(tabId).catch(() => undefined);
      }
    }
  }

  private async executeStep(
    taskId: string,
    goal: string,
    plan: ExecutionPlan,
    tabId: string,
    step: ExecutionPlanStep
  ): Promise<unknown> {
    switch (step.type) {
      case 'navigate': {
        await this.browserSession.navigateTab(tabId, step.url);
        await sleep(500);
        return { url: step.url };
      }
      case 'search': {
        const encoded = encodeURIComponent(step.query);
        const engine = step.engine ?? 'google';
        if (engine === 'google') {
          await this.browserSession.navigateTab(
            tabId,
            `https://www.google.com/search?q=${encoded}`
          );
        }
        await sleep(500);
        return { engine, query: step.query };
      }
      case 'waitForSelector': {
        await this.browserSession.waitForSelector(
          tabId,
          step.selector,
          step.timeoutMs ?? 10000
        );
        return { selector: step.selector };
      }
      case 'type': {
        await this.browserSession.typeInto(tabId, step.selector, step.text, step.submit ?? false);
        await sleep(500);
        return { selector: step.selector, submitted: Boolean(step.submit) };
      }
      case 'click': {
        await this.browserSession.click(tabId, step.selector);
        await sleep(500);
        return { selector: step.selector };
      }
      case 'scroll': {
        if (step.mode === 'smooth-bottom') {
          await this.browserSession.scrollToBottomSmoothly(tabId);
        } else {
          await this.browserSession.scrollPage(tabId, step.scrollY ?? 0);
        }
        await sleep(300);
        return { mode: step.mode };
      }
      case 'healthCheck': {
        const start = Date.now();
        let status = 0;
        let title = '';
        try {
          await this.browserSession.navigateTab(tabId, step.url);
          title = await this.browserSession.executeScript<string>(
            tabId,
            `() => document.title || ''`
          );
          status = 200;
        } catch (e) {
          status = 0;
          title = '';
          this.logger.warn(
            `Health-check failed for ${step.url}: ${e instanceof Error ? e.message : String(e)}`
          );
        }
        const screenshotB64 = await this.browserSession.getTabScreenshotJpegB64(tabId);
        return {
          url: step.url,
          title,
          loadTime: Date.now() - start,
          status,
          screenshotB64,
        };
      }
      case 'summarise': {
        const summary = await this.agentService.summarise(step.text);
        return { summary };
      }
      case 'extract': {
        const html = await this.browserSession.getPageHTML(tabId);
        const limit = step.limit ?? plan.extractLimit ?? 20;
        const prompt = this.buildExtractionPrompt(goal, step.prompt, limit, step.selectorHint);
        const raw = await this.agentService.generateRaw(
          prompt.replace('[[HTML]]', html.slice(0, 50000))
        );
        const items = this.tryParseJsonArray(raw);
        const sliced = items.slice(0, limit);

        await this.highlightExtractedItems(taskId, tabId, sliced, step.selectorHint);

        return sliced;
      }
      case 'highlight': {
        await this.browserSession.highlightElement(tabId, step.selector, step.index);
        this.eventsGateway.emitHighlight({
          taskId,
          selector: step.selector,
          index: step.index,
          message: step.message,
          timestamp: new Date().toISOString(),
        });
        return { selector: step.selector, index: step.index };
      }
      default: {
        // Exhaustive check
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const _never: never = step;
        return null;
      }
    }
  }

  private async highlightExtractedItems(
    taskId: string,
    tabId: string,
    items: unknown[],
    selectorHint?: string
  ): Promise<void> {
    if (items.length === 0) return;

    let containerSelector: string | undefined;
    if (selectorHint) {
      const validation = await this.browserSession.validateSelectorInDOM(
        tabId,
        selectorHint
      );
      if (validation.valid && validation.elementCount > 0) {
        containerSelector = selectorHint;
      }
    }

    if (!containerSelector) {
      containerSelector =
        (await this.browserSession.discoverRepeatingSelector(tabId)) ??
        undefined;
    }

    for (let i = 0; i < items.length; i++) {
      await this.browserSession.removeHighlights(taskId).catch(() => undefined);

      const searchTerms = this.extractItemSearchTerms(items[i]);
      if (searchTerms.length === 0) continue;

      const highlighted = await this.browserSession
        .highlightScrapedItem(tabId, searchTerms, containerSelector)
        .catch(() => false);

      if (!highlighted) continue;

      const ev: TaskHighlightEvent = {
        taskId,
        selector: containerSelector ?? 'text-match',
        index: i,
        message: `Highlighted scraped item ${i + 1}/${items.length}`,
        timestamp: new Date().toISOString(),
      };
      this.eventsGateway.emitHighlight(ev);

      await sleep(400);
      await this.emitImmediateFrame(taskId, tabId);
      await sleep(700);
    }
  }

  private async emitImmediateFrame(taskId: string, tabId: string): Promise<void> {
    try {
      const screenshotB64 = await this.browserSession.getTabScreenshotJpegB64(tabId);
      this.eventsGateway.emitFrame({
        taskId,
        frameIndex: this.frameIndex++,
        screenshotB64,
        timestamp: new Date().toISOString(),
      });
    } catch {
      // ignore transient screenshot errors
    }
  }

  private extractItemSearchTerms(item: unknown): string[] {
    if (!item || typeof item !== 'object') return [];
    const obj = item as Record<string, unknown>;
    const terms: string[] = [];

    for (const key of [
      'title',
      'name',
      'heading',
      'label',
      'jobTitle',
      'role',
      'position',
      'company',
      'location',
      'date',
      'postedDate',
      'text',
    ]) {
      const value = obj[key];
      if (typeof value === 'string' && value.trim().length > 2) {
        terms.push(value.trim());
      }
    }

    if (typeof obj['url'] === 'string') {
      try {
        const pathname = new URL(obj['url']).pathname;
        const segment = pathname.split('/').filter(Boolean).pop();
        if (segment && segment.length > 3) {
          terms.push(decodeURIComponent(segment.replace(/-/g, ' ')));
        }
      } catch {
        // ignore invalid URLs
      }
    }

    return terms;
  }

  private buildExtractionPrompt(
    goal: string,
    stepPrompt: string,
    limit: number,
    selectorHint?: string
  ): string {
    return `You are a web extraction engine. Return ONLY valid JSON.\n\nGoal: ${goal}\nTask: ${stepPrompt}\nLimit: ${limit}\n${selectorHint ? `Selector hint: ${selectorHint}` : ''}\n\nHTML:\n[[HTML]]\n\nReturn a JSON array of up to ${limit} items. Each item should include at least: title, company, location, url, and any other useful fields.`;
  }

  private tryParseJsonArray(text: string): unknown[] {
    const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const start = cleaned.indexOf('[');
    const end = cleaned.lastIndexOf(']');
    if (start === -1 || end === -1 || end <= start) return [];
    const slice = cleaned.slice(start, end + 1);
    try {
      const parsed = JSON.parse(slice) as unknown;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}

