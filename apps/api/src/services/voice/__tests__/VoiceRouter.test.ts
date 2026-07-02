import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { IntentRegistryManager } from '../IntentRegistryManager.js';
import { VoiceRouter } from '../VoiceRouter.js';

describe('Voice Intent Router & VFS Modularization (Step 4)', () => {
  let tmpDir: string;
  let registryManager: IntentRegistryManager;
  let router: VoiceRouter;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'evaix-voice-test-'));
    registryManager = new IntentRegistryManager(tmpDir);
    router = new VoiceRouter(tmpDir);
  });

  afterEach(async () => {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {
      // cleanup ignore
    }
  });

  it('initializes default intent registry in flat-file JSON VFS', async () => {
    const registry = await registryManager.loadRegistry();
    expect(registry.intents.length).toBeGreaterThanOrEqual(3);
    
    const registryPath = registryManager.getRegistryFilePath();
    const exists = await fs.stat(registryPath).then(() => true).catch(() => false);
    expect(exists).toBe(true);
  });

  it('auto-generates 3-5 natural language variations for new bash commands', async () => {
    const triggers = registryManager.generateSynonymTriggers('write a python script');
    expect(triggers.length).toBeGreaterThanOrEqual(3);
    expect(triggers.length).toBeLessThanOrEqual(5);
    expect(triggers).toContain('write a python script');
    expect(triggers.some(t => t.startsWith("let's "))).toBe(true);

    const registered = await registryManager.autoGenerateAndRegister({
      id: 'custom_task',
      path: 'custom_task.sh',
      baseCommand: 'create api endpoint',
      accepts_args: true
    });

    expect(registered.triggers.length).toBeGreaterThanOrEqual(3);
    expect(registered.id).toBe('custom_task');
  });

  it('parses transcription, matches longest trigger, strips phrase, and passes positional args', async () => {
    await registryManager.ensureStorage();

    const result = await router.parseIntent("let's chat and write a python script");
    expect(result.matched).toBe(true);
    expect(result.intent?.id).toBe('chat');
    expect(result.triggerMatched).toBe("let's chat");
    expect(result.remainderArgs).toBe('and write a python script');
    expect(result.argList).toEqual(['and write a python script']);
  });

  it('spawns local child process executing target .sh file with positional args', async () => {
    await registryManager.ensureStorage();

    const execResult = await router.route("let's chat and write a python script");
    expect('success' in execResult).toBe(true);

    if ('success' in execResult) {
      expect(execResult.success).toBe(true);
      expect(execResult.intentId).toBe('chat');
      expect(execResult.stdout).toContain('[VOICE_INTENT:CHAT]');
      expect(execResult.stdout).toContain('and write a python script');
      expect(execResult.argsPassed).toEqual(['and write a python script']);
    }
  });
});
