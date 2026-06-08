import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import {
  ServerToClientEvents,
  TaskCompletedEvent,
  TaskErrorEvent,
  TaskFrameEvent,
  TaskHighlightEvent,
  TaskPlanningEvent,
  TaskStepEvent,
} from '@conductor/shared-types';
import { getAllowedOrigins } from '../config/cors';

@WebSocketGateway({
  cors: {
    origin: getAllowedOrigins(),
    credentials: true,
  },
})
export class EventsGateway implements OnGatewayConnection {
  private readonly logger = new Logger(EventsGateway.name);

  @WebSocketServer()
  server!: Server<Record<string, never>, ServerToClientEvents>;

  handleConnection(): void {
    this.logger.log('Client connected to Socket.IO gateway');
  }

  emitPlanning(event: TaskPlanningEvent): void {
    this.server.emit('task:planning', event);
  }

  emitStep(event: TaskStepEvent): void {
    this.server.emit('task:step', event);
  }

  emitFrame(event: TaskFrameEvent): void {
    this.server.emit('task:frame', event);
  }

  emitHighlight(event: TaskHighlightEvent): void {
    this.server.emit('task:highlight', event);
  }

  emitCompleted(event: TaskCompletedEvent): void {
    this.server.emit('task:completed', event);
  }

  emitError(event: TaskErrorEvent): void {
    this.server.emit('task:error', event);
  }
}
