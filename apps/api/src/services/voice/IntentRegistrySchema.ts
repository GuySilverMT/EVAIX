/**
 * Intent Registry Schema Definition for EVAIX Voice Router
 * Flat-file JSON schema stored in .evaix/voice/intent_registry.json
 */

export interface IntentDefinition {
  /** Unique intent identifier (e.g., 'start_chat', 'create_python_script') */
  id: string;
  /** Relative path inside .evaix/voice/scripts/ (e.g., 'chat.sh') */
  path: string;
  /** Array of synonym trigger phrases (e.g., ["let's chat", "start chat", "chat with me"]) */
  triggers: string[];
  /** Whether the script accepts positional arguments passed from transcription remainder */
  accepts_args: boolean;
  /** Optional human-readable description of the intent */
  description?: string;
}

export interface IntentRegistry {
  version: string;
  lastUpdated: string;
  intents: IntentDefinition[];
}
