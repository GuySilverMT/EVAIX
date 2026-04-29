import * as fs from 'fs';
import { AgentService } from './agent.service.js';
import { prisma } from '../db.js';

export class LogWarden {
  private logPath: string;
  private agentService: AgentService;
  private isChecking = false;

  constructor(logPath: string = 'logs_tail.txt') {
    this.logPath = logPath;
    this.agentService = new AgentService();
  }

  public start() {
    console.log(`[LogWarden] 🛡️ Watching logs at ${this.logPath}...`);
    // Tail the log file every 10 seconds
    setInterval(() => this.checkLogs(), 10000);
  }

  private async checkLogs() {
    if (this.isChecking) return;
    this.isChecking = true;

    try {
      if (!fs.existsSync(this.logPath)) return;
      
      const content = fs.readFileSync(this.logPath, 'utf8');
      const lines = content.split('\n').slice(-50); // Last 50 lines
      
      const hasStall = lines.some(l => 
        l.includes('TIMEOUT') || 
        l.includes('STALL') || 
        l.includes('Hanging on sudo') ||
        l.includes('APIConnectionTimeoutError')
      );

      if (hasStall) {
        console.warn(`[LogWarden] 🚨 Potential STALL detected in logs! Spawning Debugger Agent...`);
        await this.spawnDebugger();
        // Clear log after processing? Or just wait for the debugger to kill the process?
        // Usually, we want the debugger to find the pid and kill it.
      }
    } catch (e) {
      console.error("[LogWarden] Error checking logs:", e);
    } finally {
      this.isChecking = false;
    }
  }

  private async spawnDebugger() {
    try {
      // Find a card to use for the debugger session
      // For now, use the first card or a dedicated recovery card
      const card = await prisma.workOrderCard.findFirst();
      if (!card) return;

      await this.agentService.startSession({
        cardId: card.id,
        roleId: 'debugger-agent', // Assumes this role exists or falls back to default
        userGoal: "CRITICAL: The system has detected a process stall in logs_tail.txt. Find the hanging process (likely gemini-cli or a sudo command) and KILL it. Use terminal_execute with 'ps aux' and 'kill -9'.",
        modelConfig: {
          temperature: 0.1,
          maxTokens: 1024
        }
      });
      console.log("[LogWarden] ✅ Debugger Agent spawned successfully.");
    } catch (e) {
      console.error("[LogWarden] Failed to spawn Debugger Agent:", e);
    }
  }
}

export const logWarden = new LogWarden();
