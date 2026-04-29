/**
 * Voice Router
 * 
 * tRPC router for voice playground functionality
 * Handles STT/TTS engine management, role management, and Android bridge
 */

import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc.js';
import { getVoiceEngineRegistry } from '../services/voice/engineRegistry.js';
import { getInputController } from '../services/voice/inputController.js';
import { getOutputController } from '../services/voice/outputController.js';
import { getKeywordListenerService } from '../services/voice/keywordListener.js';
import { getAIRoleManager } from '../services/aiRoleManager.js';
import { getAndroidBridgeService } from '../services/androidBridge.js';

export const voiceRouter = createTRPCRouter({
  // Engine Registry endpoints
  listEngines: publicProcedure
    .input(z.object({
      type: z.enum(['STT', 'TTS', 'BIDIRECTIONAL', 'KEYWORD_LISTENER', 'REMOTE_INPUT']).optional(),
    }))
    .query(async ({ input }) => {
      const registry = getVoiceEngineRegistry();
      
      if (input.type) {
        return registry.listEnginesByType(input.type);
      }
      
      return registry.listAllEngines();
    }),
  
  getActiveEngine: publicProcedure
    .input(z.object({
      type: z.enum(['STT', 'TTS', 'BIDIRECTIONAL', 'KEYWORD_LISTENER', 'REMOTE_INPUT']),
    }))
    .query(async ({ input }) => {
      const registry = getVoiceEngineRegistry();
      const engine = registry.getActiveEngine(input.type);
      
      return engine ? engine.config : null;
    }),
  
  setActiveEngine: publicProcedure
    .input(z.object({
      type: z.enum(['STT', 'TTS', 'BIDIRECTIONAL', 'KEYWORD_LISTENER', 'REMOTE_INPUT']),
      engineId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const registry = getVoiceEngineRegistry();
      registry.setActiveEngine(input.type, input.engineId);
      
      return { success: true };
    }),
  
  // Input Controller endpoints
  transcribeAudio: publicProcedure
    .input(z.object({
      audioData: z.string(), // base64 encoded
      source: z.enum(['microphone', 'file', 'android', 'keyword_trigger', 'google_voice_keyboard']),
      engineId: z.string().optional(),
      metadata: z.record(z.any()).optional(),
    }))
    .mutation(async ({ input }) => {
      const controller = getInputController();
      const audioBuffer = Buffer.from(input.audioData, 'base64');
      
      const result = await controller.processInput({
        id: `input_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        source: input.source,
        timestamp: new Date(),
        audioData: audioBuffer,
        metadata: input.metadata,
      }, input.engineId);
      
      return result;
    }),
  
  getInputQueueStatus: publicProcedure
    .query(async () => {
      const controller = getInputController();
      return controller.getQueueStatus();
    }),
  
  // Output Controller endpoints
  synthesizeSpeech: publicProcedure
    .input(z.object({
      text: z.string(),
      voice: z.string().optional(),
      language: z.string().optional(),
      speed: z.number().optional(),
      pitch: z.number().optional(),
      engineId: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const controller = getOutputController();
      
      const result = await controller.synthesize(input.text, {
        voice: input.voice,
        language: input.language,
        speed: input.speed,
        pitch: input.pitch,
        engineId: input.engineId,
      });
      
      return {
        ...result,
        audioData: result.audioData ? result.audioData.toString('base64') : undefined,
      };
    }),
  
  getOutputQueueStatus: publicProcedure
    .query(async () => {
      const controller = getOutputController();
      return controller.getQueueStatus();
    }),
  
  // Keyword Listener endpoints
  startKeywordListener: publicProcedure
    .input(z.object({
      engineId: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const service = getKeywordListenerService();
      await service.startListening(input.engineId);
      
      return { success: true };
    }),
  
  stopKeywordListener: publicProcedure
    .mutation(async () => {
      const service = getKeywordListenerService();
      await service.stopListening();
      
      return { success: true };
    }),
  
  getKeywordListenerStatus: publicProcedure
    .query(async () => {
      const service = getKeywordListenerService();
      
      return {
        isListening: service.getIsListening(),
        activeEngineId: service.getActiveEngineId(),
        registeredKeywords: service.getRegisteredKeywords(),
      };
    }),
  
  registerKeyword: publicProcedure
    .input(z.object({
      keyword: z.string(),
    }))
    .mutation(async ({ input }) => {
      const service = getKeywordListenerService();
      
      // Register with a default callback (can be enhanced later)
      service.registerKeyword(input.keyword, (event) => {
        console.log('Keyword detected:', event);
      });
      
      return { success: true };
    }),
  
  unregisterKeyword: publicProcedure
    .input(z.object({
      keyword: z.string(),
    }))
    .mutation(async ({ input }) => {
      const service = getKeywordListenerService();
      service.unregisterKeyword(input.keyword);
      
      return { success: true };
    }),
  
  // AI Role Manager endpoints
  listRoles: publicProcedure
    .query(async () => {
      const manager = getAIRoleManager();
      return manager.getAllRoles();
    }),
  
  getRole: publicProcedure
    .input(z.object({
      roleId: z.string(),
    }))
    .query(async ({ input }) => {
      const manager = getAIRoleManager();
      return manager.getRole(input.roleId);
    }),
  
  getActiveRole: publicProcedure
    .query(async () => {
      const manager = getAIRoleManager();
      return manager.getActiveRole();
    }),
  
  setActiveRole: publicProcedure
    .input(z.object({
      roleId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const manager = getAIRoleManager();
      manager.setActiveRole(input.roleId);
      
      return { success: true };
    }),
  
  createRole: publicProcedure
    .input(z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      personality: z.string(),
      systemPrompt: z.string(),
      contextModifiers: z.object({
        temperature: z.number().optional(),
        topP: z.number().optional(),
        maxTokens: z.number().optional(),
        stopSequences: z.array(z.string()).optional(),
      }).optional(),
      responseStyle: z.object({
        verbosity: z.enum(['concise', 'normal', 'detailed']).optional(),
        tone: z.enum(['casual', 'professional', 'technical']).optional(),
        formatting: z.enum(['plain', 'markdown', 'structured']).optional(),
      }).optional(),
      voiceSettings: z.object({
        preferredVoice: z.string().optional(),
        speed: z.number().optional(),
        pitch: z.number().optional(),
      }).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const manager = getAIRoleManager();
      
      manager.registerRole({
        ...input,
        isActive: input.isActive ?? true,
      });
      
      return { success: true };
    }),
  
  updateRole: publicProcedure
    .input(z.object({
      roleId: z.string(),
      updates: z.object({
        name: z.string().optional(),
        description: z.string().optional(),
        personality: z.string().optional(),
        systemPrompt: z.string().optional(),
        contextModifiers: z.object({
          temperature: z.number().optional(),
          topP: z.number().optional(),
          maxTokens: z.number().optional(),
          stopSequences: z.array(z.string()).optional(),
        }).optional(),
        responseStyle: z.object({
          verbosity: z.enum(['concise', 'normal', 'detailed']).optional(),
          tone: z.enum(['casual', 'professional', 'technical']).optional(),
          formatting: z.enum(['plain', 'markdown', 'structured']).optional(),
        }).optional(),
        voiceSettings: z.object({
          preferredVoice: z.string().optional(),
          speed: z.number().optional(),
          pitch: z.number().optional(),
        }).optional(),
        isActive: z.boolean().optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      const manager = getAIRoleManager();
      const updated = manager.updateRole(input.roleId, input.updates);
      
      return updated;
    }),
  
  deleteRole: publicProcedure
    .input(z.object({
      roleId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const manager = getAIRoleManager();
      manager.deleteRole(input.roleId);
      
      return { success: true };
    }),
  
  // Android Bridge endpoints
  getAndroidDevices: publicProcedure
    .query(async () => {
      const bridge = getAndroidBridgeService();
      return bridge.getConnectedDevices();
    }),
  
  getAndroidBridgeStatus: publicProcedure
    .query(async () => {
      const bridge = getAndroidBridgeService();
      
      return {
        isRunning: bridge.isRunning(),
        connectedDevices: bridge.getConnectedDevices().length,
      };
    }),
  
  startAndroidBridge: publicProcedure
    .input(z.object({
      port: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const bridge = getAndroidBridgeService(input.port);
      bridge.start();
      
      return { success: true };
    }),
  
  stopAndroidBridge: publicProcedure
    .mutation(async () => {
      const bridge = getAndroidBridgeService();
      bridge.stop();
      
      return { success: true };
    }),
});
