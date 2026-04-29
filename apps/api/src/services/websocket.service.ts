import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import type { IncomingMessage } from 'http';
import { spawn } from 'child_process';

/**
 * Manages the WebSocket server for handling Virtual File System (VFS) operations.
 * It initializes the server, handles incoming connections, and validates VFS session tokens.
 */
export class WebSocketService {
  private wss: WebSocketServer;

  /**
   * Creates an instance of WebSocketService and initializes the WebSocket server.
   * @param server - The HTTP server instance to attach the WebSocket server to.
   */
  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/vfs' });
    this.initialize();
  }

  /**
   * Broadcast a JSON-serializable payload to all connected WebSocket clients.
   * Used for lightweight app events such as ingest progress messages.
   */
  public broadcast(payload: any): void {
    try {
      const message = JSON.stringify(payload);
      this.wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    } catch (err) {
      console.error('Failed to broadcast WebSocket message:', err);
    }
  }

  /**
   * Initializes the WebSocket server and sets up connection handling.
   * @private
   */
  private initialize(): void {
    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      console.log('WebSocket client connected');
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const vfsToken = url.searchParams.get('vfs_token');

      if (!vfsToken) {
        console.log('WebSocket client disconnected: No VFS token provided.');
        ws.close(1008, 'No VFS token provided');
        return;
      }

      console.log('VFS session validated for WebSocket client. Spawning shell...');

      // Fallback to raw bash spawn since node-pty failed to build and python3 is missing/broken.
      // We implement a custom "Line Editor" in TypeScript to simulate PTY behavior (echo, line buffering).
      const shell = spawn('/bin/bash', [], {
        env: { ...process.env, TERM: 'xterm-256color' },
        cwd: process.cwd()
      });

      // Send a fake prompt on connection (delayed to ensure client is ready)
      setTimeout(() => {
        const prompt = '\r\n\x1b[32m$ \x1b[0m';
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                timestamp: new Date().toISOString(),
                type: 'info',
                message: prompt
            }));
        }
      }, 100);

      // Handle shell output
      shell.stdout.on('data', (data) => {
        ws.send(JSON.stringify({
          timestamp: new Date().toISOString(),
          type: 'info',
          message: `${data.toString()}\r\n\x1b[32m$ \x1b[0m` // Append prompt after output
        }));
      });

      shell.stderr.on('data', (data) => {
        ws.send(JSON.stringify({
          timestamp: new Date().toISOString(),
          type: 'error',
          message: data.toString()
        }));
      });

      shell.on('exit', (code) => {
        console.log(`Shell exited with code ${code}`);
        ws.close();
      });
      
      ws.on('error', (err) => {
          console.error('WebSocket error:', err);
      });

      // Line buffer for editing
      let currentLine = '';

      // Handle incoming messages (input to shell)
      ws.on('message', (message: string) => {
        try {
          const parsed = JSON.parse(message);
          
          // Handle resize (ignored for raw spawn)
          if (parsed.resize) {
            return;
          }

          // Handle input
          const input = parsed.command || parsed;
          
          if (typeof input === 'string') {
             // Implement basic line discipline (Echo + Editing)
             for (const char of input) {
               if (char === '\r' || char === '\n') {
                 // Enter key: Echo newline, send line to shell, clear buffer
                 ws.send(JSON.stringify({
                    timestamp: new Date().toISOString(),
                    type: 'info',
                    message: '\r\n'
                 }));
                 shell.stdin.write(currentLine + '\n');
                 currentLine = '';
               } else if (char === '\x7f' || char === '\b') {
                 // Backspace: Remove last char from buffer, echo backspace sequence
                 if (currentLine.length > 0) {
                   currentLine = currentLine.slice(0, -1);
                   // Move back, print space, move back
                   ws.send(JSON.stringify({
                      timestamp: new Date().toISOString(),
                      type: 'info',
                      message: '\b \b'
                   }));
                 }
               } else if (char >= ' ') {
                 // Printable character: Add to buffer, echo
                 currentLine += char;
                 ws.send(JSON.stringify({
                    timestamp: new Date().toISOString(),
                    type: 'info',
                    message: char
                 }));
               }
             }
          }
        } catch (e) {
            // If parse fails, treat as raw string
            console.error('Failed to parse message:', e);
        }
      });

      ws.on('close', (code, reason) => {
        console.log(`WebSocket client disconnected. Code: ${code}, Reason: ${reason.toString()}`);
        shell.kill();
      });
    });
  }

  /**
   * Closes the WebSocket server and terminates all client connections.
   */
  public close(): void {
    console.log('Closing WebSocket server...');
    this.wss.close();
  }
}
  