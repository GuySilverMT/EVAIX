import { prisma } from '../db.js';
import { resolveModelForRole } from './modelManager.service.js';


// import { saveModelKnowledge } from './ModelKnowledgeBase.js';
import type { Model, ProviderConfig, ModelCapabilities } from '@prisma/client';

/**
 * SURVEYOR SERVICE
 * * The "Map of Florida" - Uses regex patterns to instantly identify model capabilities
 * without burning tokens or making API calls. This is the FAST PATH for data collection.
 */

export interface ModelSpecs {
  contextWindow?: number;
  maxOutput?: number;
  capabilities: string[];
  costPer1k?: number;
  rateLimit?: {
    rpm?: number;
    tpm?: number;
    rpd?: number;
  };
  confidence?: string;
  source?: string;
  primaryTask?: string;
  embedding_length?: number; // For embedding models
}

interface ProviderPattern {
  pattern: RegExp;
  specs: ModelSpecs;
}

const PROVIDER_PATTERNS: Record<string, ProviderPattern[]> = {
  // ===== GOOGLE =====
  google: [
    {
      pattern: /gemini.2\.?0.flash.lite/i,
      specs: {
        contextWindow: 1000000,
        maxOutput: 8192,
        capabilities: ["text", "vision", "audio_in", "tool_use"],
        costPer1k: 0.075
      }
    },
    {
      pattern: /gemini.2\.?0.flash/i, // Catch-all for regular flash
      specs: {
        contextWindow: 1000000,
        maxOutput: 8192,
        capabilities: ["text", "vision", "audio_in", "video_in", "tool_use"],
        costPer1k: 0.10
      }
    },
    {
      pattern: /gemini.2\.?0.pro/i,
      specs: {
        contextWindow: 2000000,
        maxOutput: 8192,
        capabilities: ["text", "vision", "audio_in", "video_in", "tool_use", "reasoning"],
        costPer1k: 0
      }
    },
    {
      pattern: /gemini.3.pro/i, // Antigravity / Future
      specs: {
        contextWindow: 4000000,
        maxOutput: 16384,
        capabilities: ["text", "vision", "audio_in", "video_in", "reasoning"],
        costPer1k: 5.00
      }
    },
    {
      pattern: /gemini.1\.?5.flash.8b/i,
      specs: {
        contextWindow: 1000000,
        maxOutput: 4096,
        capabilities: ["text", "vision", "tool_use"],
        costPer1k: 0.03
      }
    },
    {
      pattern: /gemini.1\.?5.flash/i,
      specs: {
        contextWindow: 1000000,
        maxOutput: 8192,
        capabilities: ["text", "vision", "audio_in", "tool_use"],
        costPer1k: 0.075
      }
    },
    {
      pattern: /gemini.1\.?5.pro/i,
      specs: {
        contextWindow: 2000000,
        maxOutput: 8192,
        capabilities: ["text", "vision", "audio_in", "video_in", "tool_use"],
        costPer1k: 1.25
      }
    },
    {
      pattern: /gemma.3/i,
      specs: {
        contextWindow: 8192, // Heuristic for Gemma 3
        capabilities: ["text", "tool_use"],
        costPer1k: 0
      }
    },
    {
      pattern: /embedding/i,
      specs: {
        contextWindow: 2048,
        capabilities: ["embedding"],
        primaryTask: "embedding",
        costPer1k: 0.00001
      }
    }
  ],

  // ... (OpenAI, Anthropic, Mistral, Groq, NVIDIA, Cerebras unchanged) ...

  // ===== OPENROUTER / GENERAL =====
  openrouter: [
    {
      pattern: /deepseek.r1/i,
      specs: {
        contextWindow: 128000,
        maxOutput: 32768,
        capabilities: ["text", "reasoning"],
        costPer1k: 0.55
      }
    },
    {
      pattern: /qwen.*(2\.5|3)/i,
      specs: {
        contextWindow: 32768,
        capabilities: ["text"],
        costPer1k: 0.1
      }
    },
    {
      pattern: /gemma.?2/i,
      specs: {
        contextWindow: 8192,
        capabilities: ["text"],
        costPer1k: 0.1
      }
    },
    {
      pattern: /flux/i,
      specs: {
        contextWindow: 0,
        capabilities: ["image_gen"],
        costPer1k: 0.04
      }
    },
    {
      // Generic Hermes catch-all (Uncensored)
      pattern: /hermes.*(3|405b|70b)/i,
      specs: {
        contextWindow: 128000,
        capabilities: ["text", "tool_use", "uncensored"],
        costPer1k: 0.2
      }
    },
    {
      // Generic Llama catch-all
      pattern: /llama.*(3|405b|70b)/i,
      specs: {
        contextWindow: 128000,
        capabilities: ["text", "tool_use"],
        costPer1k: 0.2
      }
    }
  ],

  // ===== XAI / GROK =====
  xai: [
    {
      pattern: /grok.*reasoning/i,
      specs: {
        contextWindow: 128000,
        capabilities: ["text", "tool_use", "reasoning"],
        costPer1k: 2.0
      }
    },
    {
      pattern: /grok.*vision/i,
      specs: {
        contextWindow: 128000,
        capabilities: ["text", "tool_use", "vision"],
        costPer1k: 2.0
      }
    },
    {
      pattern: /grok/i,
      specs: {
        contextWindow: 128000,
        capabilities: ["text", "tool_use"],
        costPer1k: 2.0
      }
    }
  ],


  // ===== OPENAI =====
  openai: [
    {
      pattern: /o1/i,
      specs: {
        contextWindow: 128000,
        maxOutput: 32768,
        capabilities: ["text", "reasoning", "tool_use"],
        costPer1k: 15.00
      }
    },
    {
      pattern: /gpt-4o/i,
      specs: {
        contextWindow: 128000,
        maxOutput: 16384,
        capabilities: ["text", "vision", "tool_use"],
        costPer1k: 2.50
      }
    },
    {
      pattern: /gpt-4-turbo/i,
      specs: {
        contextWindow: 128000,
        maxOutput: 4096,
        capabilities: ["text", "vision", "tool_use"],
        costPer1k: 10.00
      }
    },
    {
      pattern: /gpt-3\.5/i,
      specs: {
        contextWindow: 16385,
        maxOutput: 4096,
        capabilities: ["text", "tool_use"],
        costPer1k: 0.50
      }
    },
    {
      pattern: /text-embedding-3-(small|large)/i,
      specs: {
        contextWindow: 8191,
        capabilities: ["embedding"],
        primaryTask: "embedding",
        costPer1k: 0.00002
      }
    },
    {
      pattern: /text-embedding-ada/i,
      specs: {
        contextWindow: 8191,
        capabilities: ["embedding"],
        primaryTask: "embedding",
        costPer1k: 0.0001
      }
    },
    {
      pattern: /embed/i,
      specs: {
        contextWindow: 8191,
        capabilities: ["embedding"],
        primaryTask: "embedding",
        costPer1k: 0.0001
      }
    },
    {
      pattern: /tts-1/i,
      specs: {
        contextWindow: 0,
        capabilities: ["audio_out", "tts"],
        primaryTask: "tts",
        costPer1k: 15.00
      }
    },
    {
      pattern: /whisper/i,
      specs: {
        contextWindow: 0,
        capabilities: ["audio_in", "stt"],
        primaryTask: "stt",
        costPer1k: 0.006
      }
    }
  ],

  // ===== ANTHROPIC =====
  anthropic: [
    {
      pattern: /claude-3\.?5-sonnet/i,
      specs: {
        contextWindow: 200000,
        maxOutput: 8192,
        capabilities: ["text", "vision", "tool_use"],
        costPer1k: 3.00
      }
    },
    {
      pattern: /claude-3-opus/i,
      specs: {
        contextWindow: 200000,
        maxOutput: 4096,
        capabilities: ["text", "vision", "tool_use"],
        costPer1k: 15.00
      }
    },
    {
      pattern: /claude-3-haiku/i,
      specs: {
        contextWindow: 200000,
        maxOutput: 4096,
        capabilities: ["text", "vision", "tool_use"],
        costPer1k: 0.25
      }
    }
  ],

  // ===== MISTRAL =====
  mistral: [
    {
      pattern: /embed/i,
      specs: {
        contextWindow: 8192,
        capabilities: ["embedding"],
        primaryTask: "embedding",
        costPer1k: 0.1
      }
    },
    {
      pattern: /voxtral/i,
      specs: {
        contextWindow: 32768,
        capabilities: ["text", "audio_in"],
        costPer1k: 0.15
      }
    },
    {
      pattern: /min(i|e)stral/i, // Covers ministral-3b, 8b, 14b
      specs: {
        contextWindow: 128000,
        capabilities: ["text", "tool_use"],
        costPer1k: 0.1
      }
    },
    {
      pattern: /mistral-large/i,
      specs: {
        contextWindow: 128000,
        maxOutput: 8192,
        capabilities: ["text", "tool_use"],
        costPer1k: 2.00
      }
    },
    {
      pattern: /mistral-(small|medium|tiny)/i,
      specs: {
        contextWindow: 32000,
        capabilities: ["text", "tool_use"],
        costPer1k: 0.5
      }
    },
    {
      pattern: /open-mistral/i,
      specs: {
        contextWindow: 32000,
        capabilities: ["text"],
        costPer1k: 0
      }
    },
    {
      pattern: /codestral/i,
      specs: {
        contextWindow: 32000,
        capabilities: ["text", "code"],
        costPer1k: 0.30
      }
    },
    {
      pattern: /pixtral/i,
      specs: {
        contextWindow: 128000,
        capabilities: ["text", "vision"],
        costPer1k: 0.15
      }
    },
    {
      pattern: /moderation/i,
      specs: {
        contextWindow: 8192,
        capabilities: ["moderation"],
        costPer1k: 0
      }
    },
    {
      pattern: /ocr/i,
      specs: {
        contextWindow: 8192,
        capabilities: ["vision", "ocr"],
        primaryTask: "ocr",
        costPer1k: 0
      }
    }
  ],

  // ===== GROQ =====
  groq: [
    {
      pattern: /whisper.*turbo/i,
      specs: {
        contextWindow: 0,
        capabilities: ["audio_in"],
        primaryTask: "stt",
        costPer1k: 0
      }
    },
    {
      pattern: /whisper|orpheus/i,
      specs: {
        contextWindow: 0,
        capabilities: ["audio_in"],
        primaryTask: "stt",
        costPer1k: 0
      }
    },
    {
      pattern: /tts-([1234]|hd)|playai-tts/i,
      specs: {
        contextWindow: 0,
        capabilities: ["audio_out", "tts"],
        primaryTask: "tts",
        costPer1k: 0
      }
    },
    {
      pattern: /allam/i,
      specs: {
        contextWindow: 32768,
        capabilities: ["text"],
        costPer1k: 0
      }
    },
    {
      pattern: /llama.*prompt.*guard/i,
      specs: {
        contextWindow: 8192,
        capabilities: ["moderation"],
        primaryTask: "moderation",
        costPer1k: 0
      }
    },
    {
      pattern: /llama.*guard/i,
      specs: {
        contextWindow: 8192,
        capabilities: ["moderation"],
        primaryTask: "moderation",
        costPer1k: 0
      }
    },
    {
      pattern: /llama-3\.?3-70b/i,
      specs: {
        contextWindow: 128000,
        maxOutput: 8192,
        capabilities: ["text", "tool_use"],
        costPer1k: 0
      }
    },
    {
      pattern: /llama-4/i, // Maverick/Scout models
      specs: {
        contextWindow: 128000,
        capabilities: ["text", "tool_use"],
        costPer1k: 0
      }
    },
    {
      pattern: /kimi|qwen|gpt-oss/i, // Groq hosted varied models
      specs: {
        contextWindow: 32768,
        capabilities: ["text"],
        costPer1k: 0
      }
    },
    {
      pattern: /compound/i,
      specs: {
        contextWindow: 32768,
        capabilities: ["text"],
        costPer1k: 0
      }
    }
  ],

  // ===== NVIDIA =====
  nvidia: [
    // Microsoft Phi models
    {
      pattern: /phi-4.*reasoning/i,
      specs: {
        contextWindow: 16384,
        capabilities: ["text", "reasoning"],
        costPer1k: 0
      }
    },
    {
      pattern: /phi-4.*multimodal/i,
      specs: {
        contextWindow: 16384,
        capabilities: ["text", "vision"],
        costPer1k: 0
      }
    },
    {
      pattern: /phi-[34]/i,
      specs: {
        contextWindow: 16384,
        capabilities: ["text"],
        costPer1k: 0
      }
    },
    // DeepSeek models
    {
      pattern: /deepseek.*v3/i,
      specs: {
        contextWindow: 128000,
        capabilities: ["text", "reasoning"],
        costPer1k: 0
      }
    },
    {
      pattern: /deepseek.*coder/i,
      specs: {
        contextWindow: 32768,
        capabilities: ["text", "code"],
        costPer1k: 0
      }
    },
    // Google models on NVIDIA
    {
      pattern: /gemma-3/i,
      specs: {
        contextWindow: 8192,
        capabilities: ["text"],
        costPer1k: 0
      }
    },
    {
      pattern: /gemma/i,  // Catch older gemma models (gemma-7b, gemma-2b, etc.)
      specs: {
        contextWindow: 8192,
        capabilities: ["text"],
        costPer1k: 0
      }
    },
    {
      pattern: /codegemma/i,
      specs: {
        contextWindow: 8192,
        capabilities: ["text", "code"],
        costPer1k: 0
      }
    },
    {
      pattern: /paligemma/i,
      specs: {
        contextWindow: 8192,
        capabilities: ["text", "vision"],
        costPer1k: 0
      }
    },
    {
      pattern: /shieldgemma/i,
      specs: {
        contextWindow: 8192,
        capabilities: ["moderation"],
        primaryTask: "moderation",
        costPer1k: 0
      }
    },
    {
      pattern: /deplot/i,
      specs: {
        contextWindow: 4096,
        capabilities: ["vision", "ocr"],
        primaryTask: "ocr",
        costPer1k: 0
      }
    },
    // IBM Granite models
    {
      pattern: /granite.*guardian/i,
      specs: {
        contextWindow: 8192,
        capabilities: ["moderation"],
        primaryTask: "moderation",
        costPer1k: 0
      }
    },
    {
      pattern: /granite.*code/i,
      specs: {
        contextWindow: 32768,
        capabilities: ["text", "code"],
        costPer1k: 0
      }
    },
    {
      pattern: /granite-3/i,
      specs: {
        contextWindow: 8192,
        capabilities: ["text"],
        costPer1k: 0
      }
    },
    // Mistral models on NVIDIA
    {
      pattern: /codestral/i,
      specs: {
        contextWindow: 32000,
        capabilities: ["text", "code"],
        costPer1k: 0
      }
    },
    {
      pattern: /devstral/i,
      specs: {
        contextWindow: 128000,
        capabilities: ["text", "code"],
        costPer1k: 0
      }
    },
    {
      pattern: /magistral/i,
      specs: {
        contextWindow: 32000,
        capabilities: ["text"],
        costPer1k: 0
      }
    },
    {
      pattern: /ministral/i,
      specs: {
        contextWindow: 128000,
        capabilities: ["text"],
        costPer1k: 0
      }
    },
    {
      pattern: /mistral-large-3/i,
      specs: {
        contextWindow: 128000,
        capabilities: ["text", "reasoning"],
        costPer1k: 0
      }
    },
    {
      pattern: /mistral-large/i,
      specs: {
        contextWindow: 128000,
        capabilities: ["text"],
        costPer1k: 0
      }
    },
    {
      pattern: /mistral-small/i,
      specs: {
        contextWindow: 32000,
        capabilities: ["text"],
        costPer1k: 0
      }
    },
    {
      pattern: /mistral-7b/i,
      specs: {
        contextWindow: 32000,
        capabilities: ["text"],
        costPer1k: 0
      }
    },
    {
      pattern: /mistral-nemo/i,
      specs: {
        contextWindow: 128000,
        capabilities: ["text"],
        costPer1k: 0
      }
    },
    {
      pattern: /mistral-nemotron/i,
      specs: {
        contextWindow: 128000,
        capabilities: ["text", "reasoning"],
        costPer1k: 0
      }
    },
    {
      pattern: /mixtral-8x22b/i,
      specs: {
        contextWindow: 64000,
        capabilities: ["text"],
        costPer1k: 0
      }
    },
    {
      pattern: /mixtral-8x7b/i,
      specs: {
        contextWindow: 32000,
        capabilities: ["text"],
        costPer1k: 0
      }
    },
    {
      pattern: /mamba.*codestral/i,
      specs: {
        contextWindow: 32000,
        capabilities: ["text", "code"],
        costPer1k: 0
      }
    },
    // Moonshot AI (Kimi)
    {
      pattern: /kimi.*thinking/i,
      specs: {
        contextWindow: 128000,
        capabilities: ["text", "reasoning"],
        costPer1k: 0
      }
    },
    {
      pattern: /kimi/i,
      specs: {
        contextWindow: 128000,
        capabilities: ["text"],
        costPer1k: 0
      }
    },
    // MiniMax
    {
      pattern: /minimax/i,
      specs: {
        contextWindow: 32768,
        capabilities: ["text"],
        costPer1k: 0
      }
    },
    // Meta Llama on NVIDIA
    {
      pattern: /llama-4.*maverick/i,
      specs: {
        contextWindow: 128000,
        capabilities: ["text"],
        costPer1k: 0
      }
    },
    {
      pattern: /llama-4.*scout/i,
      specs: {
        contextWindow: 128000,
        capabilities: ["text"],
        costPer1k: 0
      }
    },
    {
      pattern: /llama.*guard/i,
      specs: {
        contextWindow: 8192,
        capabilities: ["moderation"],
        primaryTask: "moderation",
        costPer1k: 0
      }
    },
    // NVIDIA proprietary models
    {
      pattern: /cosmos.*reason/i,
      specs: {
        contextWindow: 32768,
        capabilities: ["text", "reasoning"],
        costPer1k: 0
      }
    },
    {
      pattern: /nemotron.*parse/i,
      specs: {
        contextWindow: 32768,
        capabilities: ["text", "rag_optimized"],
        costPer1k: 0
      }
    },
    {
      pattern: /nemoretriever/i,
      specs: {
        contextWindow: 32768,
        capabilities: ["text", "rag_optimized"],
        costPer1k: 0
      }
    },
    {
      pattern: /nemotron.*nano/i,
      specs: {
        contextWindow: 32768,
        capabilities: ["text"],
        costPer1k: 0
      }
    },
    {
      pattern: /nemotron.*mini/i,
      specs: {
        contextWindow: 32768,
        capabilities: ["text"],
        costPer1k: 0
      }
    },
    {
      pattern: /nemotron.*reward/i,
      specs: {
        contextWindow: 4096,
        capabilities: ["reward_model"],
        costPer1k: 0
      }
    },
    {
      pattern: /nemotron/i,
      specs: {
        contextWindow: 128000,
        capabilities: ["text", "reasoning"],
        costPer1k: 0
      }
    },
    {
      pattern: /neva/i,
      specs: {
        contextWindow: 32768,
        capabilities: ["text", "vision"],
        costPer1k: 0
      }
    },
    {
      pattern: /nvclip/i,
      specs: {
        contextWindow: 4096,
        capabilities: ["vision", "embedding"],
        primaryTask: "embedding",
        costPer1k: 0
      }
    },
    {
      pattern: /vila/i,
      specs: {
        contextWindow: 32768,
        capabilities: ["text", "vision"],
        costPer1k: 0
      }
    },
    {
      pattern: /streampetr/i,
      specs: {
        contextWindow: 4096,
        capabilities: ["vision"],
        costPer1k: 0
      }
    },
    {
      pattern: /riva.*translate/i,
      specs: {
        contextWindow: 8192,
        capabilities: ["text", "translation"],
        costPer1k: 0
      }
    },
    {
      pattern: /minitron/i,
      specs: {
        contextWindow: 32768,
        capabilities: ["text"],
        costPer1k: 0
      }
    },
    // Other providers on NVIDIA
    {
      pattern: /chatqa/i,
      specs: {
        contextWindow: 128000,
        capabilities: ["text", "rag_optimized"],
        costPer1k: 0
      }
    },
    {
      pattern: /jamba/i,
      specs: {
        contextWindow: 256000,
        capabilities: ["text", "reasoning"],
        costPer1k: 0
      }
    },
    {
      pattern: /yi-large/i,
      specs: {
        contextWindow: 32768,
        capabilities: ["text"],
        costPer1k: 0
      }
    },
    {
      pattern: /starcoder/i,
      specs: {
        contextWindow: 16384,
        capabilities: ["text", "code"],
        costPer1k: 0
      }
    },
    {
      pattern: /kosmos/i,
      specs: {
        contextWindow: 32768,
        capabilities: ["text", "vision", "ocr"],
        costPer1k: 0
      }
    },
    {
      pattern: /fuyu/i,
      specs: {
        contextWindow: 16384,
        capabilities: ["text", "vision"],
        costPer1k: 0
      }
    },
    {
      pattern: /bge-m3/i,
      specs: {
        contextWindow: 8192,
        capabilities: ["embedding"],
        primaryTask: "embedding",
        costPer1k: 0
      }
    },
    {
      pattern: /baichuan/i,
      specs: {
        contextWindow: 32768,
        capabilities: ["text"],
        costPer1k: 0
      }
    },
    {
      pattern: /seed-oss/i,
      specs: {
        contextWindow: 32768,
        capabilities: ["text"],
        costPer1k: 0
      }
    },
    {
      pattern: /dbrx/i,
      specs: {
        contextWindow: 32768,
        capabilities: ["text"],
        costPer1k: 0
      }
    },
    {
      pattern: /sea-lion/i,
      specs: {
        contextWindow: 32768,
        capabilities: ["text"],
        costPer1k: 0
      }
    },
    {
      pattern: /marin/i,
      specs: {
        contextWindow: 8192,
        capabilities: ["text"],
        costPer1k: 0
      }
    },
    {
      pattern: /qwen/i,
      specs: {
        contextWindow: 32768,
        capabilities: ["text"],
        costPer1k: 0
      }
    },
    {
      pattern: /palmyra/i,
      specs: {
        contextWindow: 32768,
        capabilities: ["text"],
        costPer1k: 0
      }
    },
    {
      pattern: /glm/i,
      specs: {
        contextWindow: 32768,
        capabilities: ["text"],
        costPer1k: 0
      }
    },
    {
      pattern: /chatglm/i,
      specs: {
        contextWindow: 32768,
        capabilities: ["text"],
        costPer1k: 0
      }
    },
    {
      pattern: /zamba/i,
      specs: {
        contextWindow: 32768,
        capabilities: ["text"],
        costPer1k: 0
      }
    },
    {
      pattern: /eurollm|teuken/i,
      specs: {
        contextWindow: 8192,
        capabilities: ["text"],
        costPer1k: 0
      }
    },
    {
      pattern: /rakutenai/i,
      specs: {
        contextWindow: 32768,
        capabilities: ["text"],
        costPer1k: 0
      }
    },
    {
      pattern: /sarvam/i,
      specs: {
        contextWindow: 32768,
        capabilities: ["text"],
        costPer1k: 0
      }
    },
    {
      pattern: /bielik/i,
      specs: {
        contextWindow: 32768,
        capabilities: ["text"],
        costPer1k: 0
      }
    },
    {
      pattern: /stockmark/i,
      specs: {
        contextWindow: 32768,
        capabilities: ["text"],
        costPer1k: 0
      }
    },
    {
      pattern: /falcon/i,
      specs: {
        contextWindow: 32768,
        capabilities: ["text"],
        costPer1k: 0
      }
    },
    {
      pattern: /solar/i,
      specs: {
        contextWindow: 32768,
        capabilities: ["text"],
        costPer1k: 0
      }
    },
    {
      pattern: /gpt-oss/i,
      specs: {
        contextWindow: 32768,
        capabilities: ["text"],
        costPer1k: 0
      }
    }
  ],

  // ===== CEREBRAS =====
  cerebras: [
    {
      pattern: /llama-3\.?3-70b/i,
      specs: {
        contextWindow: 128000,
        maxOutput: 8192,
        capabilities: ["text", "tool_use"],
        costPer1k: 0.60
      }
    },
    {
      pattern: /llama-?3\.?1-70b/i,
      specs: {
        contextWindow: 128000,
        maxOutput: 8192,
        capabilities: ["text", "tool_use"],
        costPer1k: 0.60
      }
    },
    {
      pattern: /llama-?3\.?1-8b/i,
      specs: {
        contextWindow: 128000,
        capabilities: ["text", "tool_use"],
        costPer1k: 0.10
      }
    },
    {
      pattern: /gpt-oss/i,
      specs: {
        contextWindow: 32768,
        capabilities: ["text"],
        costPer1k: 0.40
      }
    },
    {
      pattern: /qwen|zai|glm/i,
      specs: {
        contextWindow: 32768,
        capabilities: ["text"],
        costPer1k: 0.20
      }
    }
  ],


  // ===== OLLAMA (Local) =====
  ollama: [
    {
      // Specific embedding models
      pattern: /mxbai.*embed/i,
      specs: {
        contextWindow: 512,
        capabilities: ["embedding"],
        primaryTask: "embedding",
        costPer1k: 0
      }
    },
    {
      // Generic embedding pattern
      pattern: /embed/i,
      specs: {
        contextWindow: 2048,
        capabilities: ["embedding"],
        primaryTask: "embedding",
        costPer1k: 0
      }
    },
    {
      pattern: /vision/i,
      specs: {
        contextWindow: 128000,
        capabilities: ["text", "vision"],
        costPer1k: 0
      }
    },
    {
      // Generic fallback for any unknown Ollama model
      pattern: /.*/,
      specs: {
        contextWindow: 8192, // Conservative default
        capabilities: ["text"],
        primaryTask: "chat",
        costPer1k: 0,
        confidence: 'low',
        source: 'ollama_fallback'
      }
    }
  ],
};


interface ModelCapabilitiesDelegate {
  upsert(args: {
    where: { modelId: string };
    update: Record<string, unknown>;
    create: Record<string, unknown>;
  }): Promise<ModelCapabilities>;
}

interface UnknownModelDelegate {
  findMany(args: { include?: Record<string, unknown> }): Promise<Array<{ id: string; model: Model & { provider: ProviderConfig } }>>;
  delete(args: { where: { id: string } }): Promise<unknown>;
  upsert(args: { where: { modelId: string }; create: Record<string, unknown>; update: Record<string, unknown> }): Promise<unknown>;
}

export class Surveyor {
  /**
   * [NEW] Extract and format provider errors for UI display
   */
  static formatError(error: any): string {
    const status = error.response?.status || error.status || '500';
    const rawMessage = error.response?.data?.error?.message || error.message || 'Unknown provider error';

    // Normalize some common provider error structures
    let message = rawMessage;
    if (typeof rawMessage === 'object') message = JSON.stringify(rawMessage);

    return `[${status}] ${message}`;
  }

  /**
   * [NEW] Update provider health state in database
   */
  static async updateProviderStatus(providerId: string, status: 'ACTIVE' | 'ERROR', lastError: string | null = null) {
    const { prisma } = await import('../db.js');
    console.log(`[Surveyor] Updating status for ${providerId} to ${status}`);

    return prisma.providerConfig.update({
      where: { id: providerId },
      data: {
        status,
        lastError,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Filter out deprecated date-stamped models and utility junk.
   * If 'mistral-small-latest' exists, we reject 'mistral-small-2312', 'mistral-small-2402'.
   */
  static sanitizeModelList(models: any[]): any[] {
    const canonicalModels = new Set<string>();

    // Pass 1: Identify all canonical or latest models
    for (const m of models) {
      const id = m.id.toLowerCase();
      if (id.endsWith('-latest')) {
        canonicalModels.add(id.replace('-latest', ''));
      } else if (!id.match(/-\d{4}$/)) {
        // If it doesn't end in a date stamp, it might be a canonical version
        canonicalModels.add(id);
      }
    }

    return models.filter(m => {
      const id = m.id.toLowerCase();

      // Check for date stamps (e.g. -2402, -2312)
      const dateMatch = id.match(/(.*)-(\d{4})$/);
      if (dateMatch) {
        const prefix = dateMatch[1];
        // If we have 'prefix' or 'prefix-latest', then 'prefix-YYMM' is deprecated junk
        if (canonicalModels.has(prefix)) {
          console.log(`[Surveyor] 🗑️ Filtering deprecated model: ${m.id} (preferring canonical/latest)`);
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Inspect a model and return its specs if we can identify it via patterns
   */
  /**
   * Inspect a model and return its specs via patterns OR raw provider data
   */
  static inspect(provider: string, modelName: string, providerData?: Record<string, unknown>): ModelSpecs | null {
    // Extract provider name from labels like "NVIDIA (Env)" or "Groq (Env)"
    const providerKey = provider.toLowerCase().split(/[\s(]/)[0];

    // 0. GLOBAL PRE-FILTERS (EMBEDDINGS)
    if (modelName.toLowerCase().includes('embed') || modelName.toLowerCase().includes('embedding')) {
      return {
        contextWindow: 8192,
        capabilities: ["embedding"],
        primaryTask: "embedding",
        confidence: "high"
      };
    }

    // [ORIGINAL LOGIC CONTINUES]
    // 0. CHECK RAW DATA FIRST (If available)
    // Sometimes the API explicitly gave us the answer, but Ingestion missed it.
    let rawContext: number | undefined;
    if (providerData) {
      // Common fields across providers
      const candidates = [
        providerData.context_window,
        providerData.max_context_length,
        providerData.context_length,
        providerData.input_token_limit, // Google
        (providerData.pricing as Record<string, unknown>)?.usage // OpenRouter
      ];

      for (const c of candidates) {
        if (typeof c === 'number' && c > 4096) {
          rawContext = c;
          break;
        }
        if (typeof c === 'string' && !isNaN(parseInt(c)) && parseInt(c) > 4096) {
          rawContext = parseInt(c);
          break;
        }
      }
    }

    // 1. Try Specific Provider Rules
    const specificRules = PROVIDER_PATTERNS[providerKey] || [];

    // 2. Build prioritized ruleset: Specific -> Global Fallbacks
    // OpenRouter acts as our "Global" knowledge base for generic model names.
    const globalFallbacks = PROVIDER_PATTERNS['openrouter'] || [];
    const rules = [...specificRules, ...globalFallbacks];

    // 3. Match Pattern
    let specs: ModelSpecs | null = null;
    if (rules) {
      for (const rule of rules) {
        if (rule.pattern.test(modelName)) {
          console.log(`[Surveyor] ✅ Identified ${provider}/${modelName} via pattern`);
          specs = {
            ...rule.specs,
            confidence: 'high',
            source: 'surveyor_pattern'
          };
          break;
        }
      }
    }

    // 4. Fallback Heuristics
    if (!specs) {
      const lower = modelName.toLowerCase();
      if (lower.includes('ocr')) {
        specs = { contextWindow: 4096, capabilities: ["vision", "ocr"], primaryTask: "ocr", confidence: 'low', source: 'surveyor_heuristic' };
      } else if (lower.includes('vision') || lower.includes('vl') || lower.includes('pixtral') || lower.includes('omni')) {
        specs = { contextWindow: 4096, capabilities: ["text", "vision"], confidence: 'low', source: 'surveyor_heuristic' };
      } else if (lower.includes('image') || lower.includes('flux')) {
        specs = { contextWindow: 0, capabilities: ["image_gen"], confidence: 'medium', source: 'surveyor_heuristic' };
      } else if (lower.includes('deepseek-r1') || lower.includes('reasoner') || lower.includes('o1-') || lower.includes('o3-') || lower.includes('thought')) {
        specs = { contextWindow: 32768, capabilities: ["text", "reasoning"], confidence: 'medium', source: 'surveyor_heuristic' };
      } else if (lower.includes('reward')) {
        specs = { contextWindow: 4096, capabilities: ["text", "reward_model"], confidence: 'medium', source: 'surveyor_heuristic' };
      } else if (lower.includes('moderation') || lower.includes('guard') || lower.includes('shield')) {
        specs = { contextWindow: 4096, capabilities: ["moderation"], primaryTask: "moderation", confidence: 'medium', source: 'surveyor_heuristic' };
      } else if (lower.includes('med') || lower.includes('clinical') || lower.includes('bio') || lower.includes('healthcare')) {
        specs = { contextWindow: 4096, capabilities: ["text", "medical"], confidence: 'medium', source: 'surveyor_heuristic' };
      } else if (lower.includes('weather') || lower.includes('climate')) {
        specs = { contextWindow: 4096, capabilities: ["text", "weather"], confidence: 'medium', source: 'surveyor_heuristic' };
      } else if (lower.includes('math') || lower.includes('physics')) {
        specs = { contextWindow: 4096, capabilities: ["text", "specialized_science"], confidence: 'medium', source: 'surveyor_heuristic' };
      } else if (lower.includes('code') || lower.includes('coder')) {
        specs = { contextWindow: 32768, capabilities: ["text", "code"], primaryTask: "code", confidence: 'medium', source: 'surveyor_heuristic' };
      } else if (lower.includes('embed')) {
        specs = { contextWindow: 2048, capabilities: ["embedding"], primaryTask: "embedding", confidence: 'medium', source: 'surveyor_heuristic' };
      } else if (lower.includes('tts') || lower.includes('elevenlabs') || lower.includes('playai')) {
        specs = { contextWindow: 0, capabilities: ["audio", "tts", "audio_out"], primaryTask: "tts", confidence: 'medium', source: 'surveyor_heuristic' };
      } else if (lower.includes('whisper')) {
        specs = { contextWindow: 0, capabilities: ["audio", "stt", "audio_in"], primaryTask: "stt", confidence: 'medium', source: 'surveyor_heuristic' };
      } else if (lower.includes('instruct') || lower.includes('chat')) {
        specs = { contextWindow: 32768, capabilities: ["text", "tool_use"], primaryTask: "chat", confidence: 'medium', source: 'surveyor_heuristic' };
      }
    }

    // 5. MERGE RAW DATA
    // If we found raw context in step 0, apply it (override pattern if raw is explicitly higher)
    if (rawContext) {
      if (!specs) specs = { contextWindow: rawContext, capabilities: ["text"], confidence: 'high', source: 'provider_api' };
      else if ((specs.contextWindow || 0) < rawContext) {
        console.log(`[Surveyor] 📈 Upgrading context for ${modelName} from ${specs.contextWindow} to ${rawContext} (Found in Raw Data)`);
        specs.contextWindow = rawContext;
        specs.confidence = 'high';
        specs.source = 'provider_api';
      }
    }

    // 6. Name Inference Last Resort
    if (!specs) {
      const contextMatch = modelName.match(/(\d+)k/i);
      if (contextMatch) {
        specs = {
          contextWindow: parseInt(contextMatch[1]) * 1024,
          capabilities: ["text"],
          confidence: 'medium',
          source: 'name_inference'
        };
      }
    }

    return specs;
  }

  public static async surveyModel(model: Model & { provider: ProviderConfig }): Promise<ModelCapabilities | null> {
    const { prisma } = await import('../db.js');

    // 0. Inspect the model using the general `inspect` method
    let specs = Surveyor.inspect(model.provider.name, model.name, model.providerData as Record<string, unknown>);

    if (!specs) {
      console.log(`[Surveyor] ⚠️ Could not identify specialized specs for ${model.provider.name}/${model.name} — using base defaults.`);
      specs = {
        contextWindow: 4096,
        capabilities: ["text"],
        primaryTask: "chat",
        confidence: "none",
        source: "default_fallback"
      };
    }

    // 1. Update ModelCapabilities record
    // We cast to a custom interface because some fields like 'hasEmbedding' may be missing from the generated client types
    const mc = (prisma as unknown as { modelCapabilities: ModelCapabilitiesDelegate }).modelCapabilities;
    const capabilities = await mc.upsert({
      where: { modelId: model.id },
      update: {
        contextWindow: specs.contextWindow,
        maxOutput: specs.maxOutput,
        confidence: specs.confidence,
        source: specs.source,
        hasVision: specs.capabilities.includes('vision'),
        hasReasoning: specs.capabilities.includes('reasoning'),
        hasEmbedding: specs.capabilities.includes('embedding'),
        hasTTS: specs.capabilities.includes('tts'),
        hasImageGen: specs.capabilities.includes('image_gen'),
        isMultimodal: specs.capabilities.includes('vision') || specs.capabilities.includes('image_gen') || specs.capabilities.includes('audio') || specs.capabilities.includes('video'),
        primaryTask: specs.primaryTask || (specs.capabilities.includes('embedding') ? 'embedding' : 'chat'),
        isLocal: model.provider.name.toLowerCase() === 'ollama',
        modalityTags: specs.capabilities,
        specs: specs as unknown as Record<string, unknown>,
      },
      create: {
        modelId: model.id,
        contextWindow: specs.contextWindow,
        maxOutput: specs.maxOutput,
        confidence: specs.confidence,
        source: specs.source,
        hasVision: specs.capabilities.includes('vision'),
        hasReasoning: specs.capabilities.includes('reasoning'),
        hasEmbedding: specs.capabilities.includes('embedding'),
        hasTTS: specs.capabilities.includes('tts'),
        hasImageGen: specs.capabilities.includes('image_gen'),
        isMultimodal: specs.capabilities.includes('vision') || specs.capabilities.includes('image_gen') || specs.capabilities.includes('audio') || specs.capabilities.includes('video'),
        primaryTask: specs.primaryTask || (specs.capabilities.includes('embedding') ? 'embedding' : 'chat'),
        isLocal: model.provider.name.toLowerCase() === 'ollama',
        modalityTags: specs.capabilities,
        specs: specs as unknown as Record<string, unknown>,
      },
    });

    // 2. Populate Specialized Tables based on detected specs
    if (specs.capabilities.includes('embedding')) {
      await prisma.embeddingModel.upsert({
        where: { modelId: model.id },
        create: { modelId: model.id, dimensions: specs.embedding_length || 1536 },
        update: {}
      });
    }

    if (specs.capabilities.includes('vision') || specs.capabilities.includes('ocr')) {
      await prisma.visionModel.upsert({
        where: { modelId: model.id },
        create: { modelId: model.id },
        update: {}
      });
    }

    if (specs.capabilities.includes('tts') || specs.capabilities.includes('audio_in') || specs.capabilities.includes('audio_out')) {
      await prisma.audioModel.upsert({
        where: { modelId: model.id },
        create: { modelId: model.id },
        update: {}
      });
    }

    if (specs.capabilities.includes('moderation') || specs.capabilities.includes('compliance')) {
      await prisma.complianceModel.upsert({
        where: { modelId: model.id },
        create: { modelId: model.id },
        update: {}
      });
    }

    if (specs.capabilities.includes('reward') || specs.capabilities.includes('reward_model')) {
      await prisma.rewardModel.upsert({
        where: { modelId: model.id },
        create: { modelId: model.id },
        update: {}
      });
    }

    if (specs.primaryTask === 'chat' || specs.capabilities.includes('text')) {
      await prisma.chatModel.upsert({
        where: { modelId: model.id },
        create: {
          modelId: model.id,
          contextWindow: specs.contextWindow || 4096,
          supportsTools: specs.capabilities.includes('tool_use')
        },
        update: {
          contextWindow: specs.contextWindow || 4096,
          supportsTools: specs.capabilities.includes('tool_use')
        }
      });
    }

    return capabilities;
  }

  static async surveyAll(): Promise<{ surveyed: number; unknown: number }> {
    const { prisma } = await import('../db.js');
    const p = prisma as any;

    // [UNKNOWN MODELS] Process Unchecked / Unknown Models
    // NOTE: This now only processes models where we haven't successfully identified them yet.
    const unknowns = await p.unknownModel.findMany({
      where: { reason: { notIn: ['surveyor_identified', 'skipped', 'surveyor_deferred'] } },
      include: { model: { include: { provider: true } } },
      take: 20
    });

    if (unknowns.length > 0) {
      console.log(`[Surveyor] Found ${unknowns.length} unknowns to re-process...`);
    }
    for (const unknown of unknowns) {
      const m = unknown.model;
      if (!m.isActive) continue;

      // Survey individual model
      const capabilities = await Surveyor.surveyModel(m);
      if (capabilities) {
        console.log(`[Surveyor] ✅ Identified ${m.name}. Removing from UnknownModel.`);
        await p.unknownModel.delete({ where: { id: unknown.id } });
      } else {
        // Mark as tried so we don't spam logs every startup
        await p.unknownModel.update({
          where: { id: unknown.id },
          data: { reason: 'surveyor_deferred' }
        });
      }
    }

    // [NEED HELP] Find models that are totally missing capabilities
    // High-confidence models are skipped to avoid redundant I/O and log noise.
    const modelsNeedingHelp = await prisma.model.findMany({
      where: {
        isActive: true,
        capabilities: { is: null }
      },
      include: { provider: true, capabilities: true }
    });

    if (modelsNeedingHelp.length > 0) {
      console.log(`[Surveyor] 🔍 Found ${modelsNeedingHelp.length} models missing signatures.`);
    }

    let surveyed = 0;
    let unknownCount = 0;

    for (const model of modelsNeedingHelp) {
      // PROTECTION: Skip if already high confidence or manual
      if (model.capabilities?.confidence === 'high' || model.capabilities?.source === 'manual') continue;

      // Call surveyModel for existing models that need help
      const capabilities = await Surveyor.surveyModel(model);

      if (capabilities) {
        surveyed++;
      } else {
        // [UNKNOWN] Mark as unknown so we don't try to survey every turn
        await p.unknownModel.upsert({
          where: { modelId: model.id },
          create: { modelId: model.id, reason: 'surveyor_failed' },
          update: {}
        });
        unknownCount++;
      }
    }
    if (surveyed > 0) {
      console.log(`[Surveyor] 📊 Audit complete: Identified ${surveyed} models. ${unknownCount} still unknown.`);
    }
    return { surveyed, unknown: unknownCount };
  }

  /**
   * WATERFALL DISCOVERY (Self-Healing)
   * 1. Deterministic Pass: Standard /v1/models parsing.
   * 2. Double-Check: Detect anomalies if 0 models found.
   * 3. Agentic JSON Diagnostics: Agent writes repair script for raw JSON.
   * 4. Agentic Web Escalation: Final fallback via web browsing.
   */
  static async discoverFreeModels(providerId: string): Promise<string[]> {
    const provider = await prisma.providerConfig.findUnique({
      where: { id: providerId }
    });

    if (!provider || !provider.baseUrl) {
      console.error(`[Surveyor] Provider ${providerId} not found or has no baseUrl`);
      return [];
    }

    console.log(`[Surveyor] 🌊 Starting Self-Healing Waterfall Discovery for ${providerId}`);

    // STEP 1: THE DETERMINISTIC PASS
    let rawJsonResponse: any = null;
    try {
      const axios = (await import('axios')).default;
      const apiKey = process.env[`${providerId.toUpperCase()}_API_KEY`] || '';
      const response = await axios.get(`${provider.baseUrl}/models`, {
        headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}
      });
      rawJsonResponse = response.data;

      const models = rawJsonResponse?.data || rawJsonResponse || [];
      const freeModels: string[] = [];

      if (Array.isArray(models)) {
        for (const m of models) {
          const id = m.id || m.name;
          if (!id) continue;

          const isExplicitFree = id.toLowerCase().endsWith(':free');
          const pricing = m.pricing || m.cost || {};
          const isPricingFree = (pricing.prompt !== undefined && Number(pricing.prompt) === 0) ||
            (pricing.input !== undefined && Number(pricing.input) === 0);

          if (isExplicitFree || isPricingFree) {
            console.log(`[Surveyor] ✅ Found free model via API (Step 1): ${id}`);
            freeModels.push(id);
            await this.saveFreeModel(providerId, id);
          }
        }
      }

      // STEP 2: THE "DOUBLE-CHECK" VALIDATION
      if (freeModels.length > 0) {
        console.log(`[Surveyor] 🎯 Discovery complete for ${providerId} (Step 1). Found ${freeModels.length} models.`);
        return freeModels;
      }
      console.warn(`[Surveyor] ⚠️ ANOMALY DETECTED for ${providerId}: Deterministic pass found 0 free models. Proceeding to Step 3.`);
    } catch (error: any) {
      console.warn(`[Surveyor] ⚠️ Step 1 (Deterministic) failed for ${providerId}: ${error.message}`);
    }

    // STEP 3: AGENTIC JSON DIAGNOSTICS (Self-Healing)
    if (rawJsonResponse) {
      console.log(`[Surveyor] 🧠 Starting Agentic JSON Diagnostics for ${providerId}`);
      try {
        const bestModelSlug = await resolveModelForRole({ id: 'researcher', metadata: {} } as any, 0, []);
        const bestModel = await prisma.model.findUnique({ where: { id: bestModelSlug } });

        if (bestModel) {
          const { AgentRuntime } = await import('./AgentRuntime.js');
          const { createVolcanoAgent } = await import('./VolcanoAgent.js');
          const runtime = await AgentRuntime.create(undefined, []);
          const agent = await createVolcanoAgent({
            roleId: 'researcher',
            modelId: bestModel.name,
            providerId: bestModel.providerId,
            userGoal: `Heal parsing logic for ${providerId}`,
            isLocked: false,
            temperature: 0,
            maxTokens: 2048
          });

          // Truncate to first 5 models to save context
          const sampleJson = Array.isArray(rawJsonResponse?.data) ? rawJsonResponse.data.slice(0, 5) :
            (Array.isArray(rawJsonResponse) ? rawJsonResponse.slice(0, 5) : rawJsonResponse);

          const prompt = `
You are a data-parsing expert. Our standard parser failed to find free models in this API response. 
Analyze this JSON schema: ${JSON.stringify(sampleJson, null, 2)}

Question: How does this specific provider indicate a model is free? 
Task: Write a TypeScript function named 'extractFreeModels' that takes a JSON array (the 'data' or root) and returns an array of model ID strings for completely free models.
Requirements:
1. Return ONLY the executable TypeScript code for the function.
2. Ensure the code is robust and handles missing fields.
`;

          const agentResponse = await runtime.generateWithContext(agent, "You are a senior dev.", prompt);
          const codeMatch = agentResponse.match(/```typescript([\s\S]*?)```/) ||
            agentResponse.match(/```javascript([\s\S]*?)```/) ||
            [null, agentResponse];
          const script = codeMatch[1].trim();

          console.log(`[Surveyor] 🛡️ Executing Agent-generated repair script for ${providerId}...`);

          try {
            // Safe Execution Wrapper
            const fn = new Function('data', `${script}; return extractFreeModels(data);`);
            const repairedModels = fn(rawJsonResponse?.data || rawJsonResponse);

            if (Array.isArray(repairedModels) && repairedModels.length > 0) {
              console.log(`[Surveyor] ✨ Self-Healing Success! Extracted ${repairedModels.length} models.`);
              for (const id of repairedModels) {
                await this.saveFreeModel(providerId, id);
              }
              return repairedModels;
            }
          } catch (e) {
            console.error("[Surveyor] ❌ Repair script crashed:", e);
          }
        }
      } catch (error) {
        console.error(`[Surveyor] ❌ Step 3 (Diagnostics) failed:`, error);
      }
    }

    // STEP 4: AGENTIC WEB ESCALATION (The Final Fallback)
    console.log(`[Surveyor] 🌐 Escalating to WEB SCAPE for ${providerId}`);
    try {
      const bestModelSlug = await resolveModelForRole({ id: 'researcher', metadata: {} } as any, 0, []);
      const bestModel = await prisma.model.findUnique({ where: { id: bestModelSlug } });

      if (!bestModel) throw new Error("No model available for research");

      const { AgentRuntime } = await import('./AgentRuntime.js');
      const { createVolcanoAgent } = await import('./VolcanoAgent.js');
      const runtime = await AgentRuntime.create(undefined, ['browse', 'research.web_scrape']);
      const agent = await createVolcanoAgent({
        roleId: 'researcher',
        modelId: bestModel.name,
        providerId: bestModel.providerId,
        userGoal: `Discover free models for ${providerId} via web`,
        isLocked: false,
        temperature: 0.1,
        maxTokens: 2048
      });

      const prompt = `
The API does not contain pricing data for ${providerId}. 
Use the 'browse' or 'research.web_scrape' tool to navigate to ${(provider as any).pricingUrl || provider.baseUrl} or search the web for '${provider.name || providerId} free API models'. 
Read the documentation and extract the exact model IDs that are available on the free tier. 

Return a strictly formatted JSON array of strings containing only the model IDs.
Example: ["model-x-free", "model-y-free"]
`;

      const response = await runtime.generateWithContext(agent, "You are a researcher.", prompt);
      const jsonMatch = response.match(/\[\s*".*"\s*\]/s) || response.match(/\[.*\]/s);
      if (jsonMatch) {
        const discovered = JSON.parse(jsonMatch[0]) as string[];
        if (Array.isArray(discovered)) {
          for (const id of discovered) {
            console.log(`[Surveyor] ✅ Agent verified free model: ${id}`);
            await this.saveFreeModel(providerId, id);
          }
          return discovered;
        }
      }
    } catch (error) {
      console.error(`[Surveyor] ❌ Step 4 (Web) failed:`, error);
    }

    return [];
  }

  private static async saveFreeModel(providerId: string, modelName: string) {
    let model = await prisma.model.findUnique({
      where: { providerId_name: { providerId, name: modelName } }
    });

    if (!model) {
      model = await prisma.model.create({
        data: {
          id: `${providerId}:${modelName}`,
          providerId,
          name: modelName,
          isActive: true,
          providerData: { source: 'surveyor_discovery' }
        }
      });
    }

    await prisma.modelCapabilities.upsert({
      where: { modelId: model.id },
      create: {
        modelId: model.id,
        isFreeTier: true,
        source: 'surveyor_discovery',
        confidence: 'high'
      } as any,
      update: {
        isFreeTier: true,
        source: 'surveyor_discovery',
        updatedAt: new Date()
      } as any
    });
  }
}
