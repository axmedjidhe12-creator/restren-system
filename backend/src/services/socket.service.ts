import { Server as SocketIOServer } from 'socket.io';

/**
 * Socket.IO singleton.
 * Initialized by server.ts, consumed by controllers without triggering listen().
 */
let io: SocketIOServer | null = null;

export const setIo = (socketServer: SocketIOServer): void => {
  io = socketServer;
};

export const getIo = (): SocketIOServer | null => {
  return io;
};
