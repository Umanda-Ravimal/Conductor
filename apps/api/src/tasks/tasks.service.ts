import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  ExecutionLogDto,
  PlannedStep,
  TaskDto,
  TaskStatus,
} from '@conductor/shared-types';
import { LogStatus, Prisma, Task } from '@prisma/client';
import { AgentService } from '../agent/agent.service';
import { EventsGateway } from '../gateway/events.gateway';
import { PrismaService } from '../prisma/prisma.service';
import { PuppeteerService } from '../puppeteer/puppeteer.service';
import { CreateTaskDto } from './dto/create-task.dto';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly agentService: AgentService,
    private readonly puppeteerService: PuppeteerService,
    private readonly eventsGateway: EventsGateway
  ) {}

  async create(dto: CreateTaskDto): Promise<{ taskId: string }> {
    const task = await this.prisma.task.create({
      data: {
        goal: dto.goal,
        taskType: dto.taskType ?? 'web-search',
        status: TaskStatus.PENDING,
      },
    });

    void this.executeTask(task.id).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Task ${task.id} failed: ${message}`);
    });

    return { taskId: task.id };
  }

  async findAll(): Promise<TaskDto[]> {
    const tasks = await this.prisma.task.findMany({
      orderBy: { createdAt: 'desc' },
      include: { logs: { orderBy: { stepNumber: 'asc' } } },
    });
    return tasks.map((task) => this.toTaskDto(task));
  }

  async findOne(id: string): Promise<TaskDto> {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: { logs: { orderBy: { stepNumber: 'asc' } } },
    });
    if (!task) {
      throw new NotFoundException(`Task ${id} not found`);
    }
    return this.toTaskDto(task);
  }

  private async executeTask(taskId: string): Promise<void> {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      return;
    }

    try {
      await this.prisma.task.update({
        where: { id: taskId },
        data: { status: TaskStatus.PLANNING },
      });

      const plan = await this.agentService.planExecution(
        task.goal,
        task.taskType ?? undefined
      );

      await this.prisma.task.update({
        where: { id: taskId },
        data: {
          stepsJson: plan as unknown as Prisma.InputJsonValue,
          status: TaskStatus.RUNNING,
        },
      });

      this.eventsGateway.emitPlanning({
        taskId,
        message: `Planned ${plan.steps.length} steps`,
        steps: plan.steps,
        plan,
      });

      await this.createLog(taskId, 0, 'Planning complete', 'INFO');

      let result: unknown;
      result = await this.puppeteerService.runPlan(taskId, task.goal, plan);

      await this.prisma.task.update({
        where: { id: taskId },
        data: {
          status: TaskStatus.COMPLETED,
          resultJson: result as Prisma.InputJsonValue,
        },
      });

      this.eventsGateway.emitCompleted({ taskId, result });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.prisma.task.update({
        where: { id: taskId },
        data: { status: TaskStatus.FAILED },
      });
      await this.createLog(taskId, 0, message, 'ERROR');
      this.eventsGateway.emitError({ taskId, message });
      throw error;
    }
  }

  private async createLog(
    taskId: string,
    stepNumber: number,
    message: string,
    status: LogStatus,
    screenshotB64?: string
  ): Promise<void> {
    await this.prisma.executionLog.create({
      data: { taskId, stepNumber, message, status, screenshotB64 },
    });
  }

  private toTaskDto(
    task: Task & {
      logs: Array<{
        id: string;
        taskId: string;
        stepNumber: number;
        message: string;
        screenshotB64: string | null;
        status: LogStatus;
        createdAt: Date;
      }>;
    }
  ): TaskDto {
    return {
      id: task.id,
      goal: task.goal,
      status: task.status as TaskStatus,
      taskType: task.taskType ?? '',
      stepsJson: (task.stepsJson as PlannedStep[] | null) ?? null,
      resultJson: task.resultJson,
      createdAt: task.createdAt.toISOString(),
      logs: task.logs.map(
        (log): ExecutionLogDto => ({
          id: log.id,
          taskId: log.taskId,
          stepNumber: log.stepNumber,
          message: log.message,
          screenshotB64: log.screenshotB64 ?? undefined,
          status: log.status as ExecutionLogDto['status'],
          createdAt: log.createdAt.toISOString(),
        })
      ),
    };
  }
}
