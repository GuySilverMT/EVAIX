/**
 * EVAIX Voice Intent Router
 * 
 * Zero-latency local voice intent parser and execution router.
 * Maps fuzzy transcribed text strings to modular local execution scripts (.sh)
 * stored in the local VFS (.evaix/voice/).
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { IntentDefinition, IntentRegistry } from './IntentRegistrySchema.js';
import { IntentRegistryManager } from './IntentRegistryManager.js';

export interface MatchResult {
  matched: boolean;
  intent?: IntentDefinition;
  triggerMatched?: string;
  remainderArgs?: string;
  argList: string[];
  score: number;
}

export interface ExecutionResult {
  success: boolean;
  intentId: string;
  matchedTrigger: string;
  scriptPath: string;
  argsPassed: string[];
  pid?: number;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  executionTimeMs: number;
}

export class VoiceRouter {
  private registryManager: IntentRegistryManager;

  constructor(baseDir?: string) {
    this.registryManager = new IntentRegistryManager(baseDir);
  }

  /**
   * Normalize input text string for fuzzy comparison
   */
  private normalize(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '')
      .replace(/\s+/g, ' ');
  }

  /**
   * Strip trigger phrase and trim remaining argument string
   */
  private cleanRemainder(remainder: string): string {
    return remainder.trim();
  }

  /**
   * Parse raw transcription string against intent registry using fuzzy syllabus matching.
   * Finds the longest matching trigger phrase at the start of the transcription string.
   */
  public async parseIntent(rawTranscription: string): Promise<MatchResult> {
    const registry: IntentRegistry = await this.registryManager.loadRegistry();
    const rawNormalized = this.normalize(rawTranscription);

    let bestMatch: MatchResult = {
      matched: false,
      argList: [],
      score: 0
    };

    for (const intent of registry.intents) {
      for (const trigger of intent.triggers) {
        const normTrigger = this.normalize(trigger);
        
        // Exact prefix match check
        const isPrefixMatch = rawNormalized === normTrigger || rawNormalized.startsWith(normTrigger + ' ');

        if (isPrefixMatch) {
          // Calculate score based on trigger phrase length (longest match wins)
          const score = normTrigger.length * 10;

          if (score > bestMatch.score) {
            // Calculate remainder string
            let remainder = '';
            if (rawNormalized.startsWith(normTrigger)) {
              // Extract raw remaining string from original transcription to preserve casing
              const originalNormalized = rawTranscription.toLowerCase();
              const triggerIdx = originalNormalized.indexOf(normTrigger.toLowerCase());
              if (triggerIdx >= 0) {
                remainder = rawTranscription.substring(triggerIdx + normTrigger.length);
              } else {
                remainder = rawTranscription.substring(normTrigger.length);
              }
            }

            const cleanedRemainder = this.cleanRemainder(remainder);
            const argList = intent.accepts_args && cleanedRemainder ? [cleanedRemainder] : [];

            bestMatch = {
              matched: true,
              intent,
              triggerMatched: trigger,
              remainderArgs: cleanedRemainder,
              argList,
              score
            };
          }
        } else {
          // Substring/Fuzzy syllabus fallback match
          if (rawNormalized.includes(normTrigger)) {
            const fuzzyScore = normTrigger.length * 3;
            if (fuzzyScore > bestMatch.score) {
              const triggerIdx = rawTranscription.toLowerCase().indexOf(normTrigger.toLowerCase());
              const remainder = triggerIdx >= 0 ? rawTranscription.substring(triggerIdx + normTrigger.length) : '';
              const cleanedRemainder = this.cleanRemainder(remainder);

              bestMatch = {
                matched: true,
                intent,
                triggerMatched: trigger,
                remainderArgs: cleanedRemainder,
                argList: intent.accepts_args && cleanedRemainder ? [cleanedRemainder] : [],
                score: fuzzyScore
              };
            }
          }
        }
      }
    }

    return bestMatch;
  }

  /**
   * Execute local bash script child process for a matched intent
   */
  public async executeScript(intent: IntentDefinition, args: string[]): Promise<ExecutionResult> {
    const startTime = Date.now();
    const scriptsDir = this.registryManager.getScriptsDir();
    const fullScriptPath = path.join(scriptsDir, intent.path);

    // Verify script file exists
    try {
      await fs.access(fullScriptPath);
    } catch {
      throw new Error(`Execution script not found at path: ${fullScriptPath}`);
    }

    // Ensure executable permissions on POSIX environments
    try {
      await fs.chmod(fullScriptPath, 0o755);
    } catch {
      // Ignore on Windows/non-POSIX
    }

    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';

      // Spawn bash execution with argument pass-through ($@)
      const child = spawn('/bin/bash', [fullScriptPath, ...args], {
        cwd: scriptsDir,
        env: { ...process.env, EVAIX_INTENT_ID: intent.id }
      });

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        const executionTimeMs = Date.now() - startTime;
        resolve({
          success: code === 0,
          intentId: intent.id,
          matchedTrigger: intent.triggers[0] || '',
          scriptPath: fullScriptPath,
          argsPassed: args,
          pid: child.pid,
          exitCode: code,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          executionTimeMs
        });
      });

      child.on('error', (err) => {
        const executionTimeMs = Date.now() - startTime;
        resolve({
          success: false,
          intentId: intent.id,
          matchedTrigger: intent.triggers[0] || '',
          scriptPath: fullScriptPath,
          argsPassed: args,
          pid: child.pid,
          exitCode: -1,
          stdout: stdout.trim(),
          stderr: err.message,
          executionTimeMs
        });
      });
    });
  }

  /**
   * Primary Entry Point: Route raw voice transcription string to execution script
   */
  public async route(transcription: string): Promise<ExecutionResult | { matched: false; rawTranscription: string; message: string }> {
    const match = await this.parseIntent(transcription);

    if (!match.matched || !match.intent) {
      return {
        matched: false,
        rawTranscription: transcription,
        message: `No matching intent trigger found for transcription: "${transcription}"`
      };
    }

    const execResult = await this.executeScript(match.intent, match.argList);
    execResult.matchedTrigger = match.triggerMatched || '';
    return execResult;
  }
}

/**
 * Singleton instance helper
 */
let routerInstance: VoiceRouter | null = null;

export function getVoiceRouter(baseDir?: string): VoiceRouter {
  if (!routerInstance || baseDir) {
    routerInstance = new VoiceRouter(baseDir);
  }
  return routerInstance;
}
