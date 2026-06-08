import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { AgentService } from '../agent/agent.service';
import { EventsGateway } from '../gateway/events.gateway';
import { ExecutionPlan, PlannedStep } from '@conductor/shared-types';
import { Browser, Page } from 'puppeteer';
import { extractExecutor } from './executors/extract.executor';
import { launchBrowser, newStealthPage } from './launch-browser';
import { navigateExecutor } from './executors/navigate.executor';
import { SearchResult, searchExecutor } from './executors/search.executor';
import { TaskExecutionService } from './task-execution.service';

export interface StepExecutionResult {
  output: unknown;
  screenshotB64?: string;
}

export interface WebSearchResult {
  query: string;
  results: SearchResult[];
  summary: string;
}

export interface ScraperRepo {
  name: string;
  url: string;
  stars: string;
  language: string;
  description: string;
}

export interface HealthCheckSite {
  url: string;
  title: string;
  loadTime: number;
  status: number;
  screenshotB64: string;
}

@Injectable()
export class PuppeteerService implements OnModuleDestroy {
  private readonly logger = new Logger(PuppeteerService.name);
  private browser: Browser | null = null;

  constructor(
    private readonly agentService: AgentService,
    private readonly eventsGateway: EventsGateway,
    private readonly taskExecutionService: TaskExecutionService
  ) {}

  async onModuleDestroy(): Promise<void> {
    await this.closeBrowser();
  }

  private async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await launchBrowser();
    }
    return this.browser;
  }

  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async captureScreenshot(page: Page): Promise<string> {
    const screenshot = await page.screenshot({
      encoding: 'base64',
      fullPage: false,
    });
    return screenshot as string;
  }

  async executeStep(
    taskId: string,
    step: PlannedStep,
    page: Page
  ): Promise<StepExecutionResult> {
    let output: unknown = null;

    switch (step.action) {
      case 'navigate':
        await navigateExecutor(page, step.target);
        output = { url: step.target };
        break;
      case 'extract':
        output = await extractExecutor(page, step.target);
        break;
      case 'search':
        output = await searchExecutor(page, step.target);
        break;
      case 'screenshot':
        output = { captured: true };
        break;
      case 'summarise':
        output = await this.agentService.summarise(step.target);
        break;
      default:
        throw new Error(`Unsupported action: ${step.action}`);
    }

    const screenshotB64 = await this.captureScreenshot(page);

    this.eventsGateway.emitStep({
      taskId,
      stepNumber: step.stepNumber,
      message: step.description,
      status: 'SCREENSHOT',
      screenshotB64,
    });

    return { output, screenshotB64 };
  }

  async runPlan(taskId: string, goal: string, plan: ExecutionPlan): Promise<unknown> {
    return this.taskExecutionService.runPlan(taskId, goal, plan);
  }
}
