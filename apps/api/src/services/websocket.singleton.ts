import type { WebSocketService } from './websocket.service.js';

let instance: WebSocketService | null = null;

export const setWebSocketService = (svc: WebSocketService) => {
  instance = svc;
};

export const getWebSocketService = (): WebSocketService | null => instance;
