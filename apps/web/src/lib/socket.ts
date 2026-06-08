import { io, Socket } from 'socket.io-client';
import type { ServerToClientEvents } from '@conductor/shared-types';

const socketUrl =
  process.env['NEXT_PUBLIC_SOCKET_URL'] ?? 'http://localhost:3001';

let socket: Socket<ServerToClientEvents> | null = null;

export function getSocket(): Socket<ServerToClientEvents> {
  if (!socket) {
    socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
