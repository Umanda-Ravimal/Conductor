import { Module } from '@nestjs/common';
import { AgentModule } from '../agent/agent.module';
import { GatewayModule } from '../gateway/gateway.module';
import { BrowserSessionService } from './browser-session.service';
import { TaskExecutionService } from './task-execution.service';
import { PuppeteerService } from './puppeteer.service';

@Module({
  imports: [AgentModule, GatewayModule],
  providers: [PuppeteerService, BrowserSessionService, TaskExecutionService],
  exports: [PuppeteerService, BrowserSessionService, TaskExecutionService],
})
export class PuppeteerModule {}
