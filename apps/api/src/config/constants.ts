
// Server Configuration
export const API_PORT = 4000;
export const API_HOST = 'http://localhost';
export const DEFAULT_CORS_ORIGIN = 'http://localhost:5173';

// Telemetry
export const VOLCANO_TELEMETRY_ENABLED = 'true';

// WebSocket
export const WS_RECONNECT_INTERVAL = 1000;

// Provider Manager
export const PROVIDER_COOLDOWN_SECONDS = 300; // 5 minutes default
export const OLLAMA_DEFAULT_HOST = 'http://127.0.0.1:11434';
export const OLLAMA_PROVIDER_ID = 'ollama-local';

// Model Defaults
export const DEFAULT_MODEL_TEMP = 0.7;
export const DEFAULT_MAX_TOKENS = 2048;
export const DEFAULT_MODEL_TAKE_LIMIT = 100;

// Encryption
// Encryption - REMOVED
// export const ENCRYPTION_KEY_LENGTH = 64;

// External URLs
export const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1';
export const GROQ_API_URL = 'https://api.groq.com/openai/v1';
export const NVIDIA_API_URL = 'https://integrate.api.nvidia.com/v1';

export const DEFAULT_FETCH_TIMEOUT_MS = 2000;
export const DEFAULT_FALLBACK_MODEL = 'gpt-3.5-turbo';

// LLM Provider Timeouts (Cognitive Recovery Strategy)
export const LLM_TIMEOUT_STANDARD_MS = 60000;  // 60 seconds for standard operations
export const LLM_TIMEOUT_COMPLEX_MS = 120000;  // 120 seconds for complex refactoring operations
export const LLM_MAX_RETRIES = 3;              // Maximum retry attempts
