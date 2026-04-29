import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { spawn } from 'child_process';

export class LanguageServerService {
  private wss: WebSocketServer | null = null;

  constructor(server: Server) {
    this.initialize(server);
  }

  private initialize(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/language-server' });

    this.wss.on('connection', (ws: WebSocket) => {
      console.log('Language server client connected');

      const ls = spawn('typescript-language-server', ['--stdio']);

      ls.stdout.on('data', (data) => {
        ws.send(data.toString());
      });

      ws.on('message', (message: string) => {
        ls.stdin.write(message);
      });

      ws.on('close', () => {
        console.log('Language server client disconnected');
        ls.kill();
      });
    });
  }
}
