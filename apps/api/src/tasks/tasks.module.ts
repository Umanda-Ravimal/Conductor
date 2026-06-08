import { Module } from '@nestjs/common';
import { AgentModule } from '../agent/agent.module';
import { GatewayModule } from '../gateway/gateway.module';
import { PuppeteerModule } from '../puppeteer/puppeteer.module';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [AgentModule, GatewayModule, PuppeteerModule],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
