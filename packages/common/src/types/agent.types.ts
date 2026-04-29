/**
 * Represents the static definition of an agent's capabilities and persona,
 * as stored in the database.
 */
export interface Role {
  /** Unique identifier for the Role (e.g., from the database). */
  id: string;

  /** Human-readable name (e.g., "React Component Developer"). */
  name: string;

  /** The system prompt that defines the agent's persona, rules, and task. */
  systemPrompt: string;

  /**
   * A list of model capability tags (e.g., ['fast', 'smart', 'vision'])
   * that the Model Manager can use to assign a suitable LLM.
   */
  modelPreferences: string[];

  /**
   * Defines the specific tools or functions this role is allowed to call.
   * An empty array means it can only write code/text.
   */
  allowedTools: string[];
}

/**
 * The data payload required to start a new agent session.
 * This is typically constructed by the frontend and sent to the backend.
 */
export interface RoleParams {
  /** The ID of the Role to use for this session. */
  roleId: string;

  /** The specific user-defined task for this session (e.g., "Create a new button component"). */
  userTask: string;

  /** The unique identifier for the workspace or filesystem this agent can access. */
  workspaceId: string;
}

/**
 * Represents a live, stateful instance of an agent working on a task.
 */
export interface AgentSession {
  /** Unique identifier for this specific session. */
  sessionId: string;

  /** The Role definition this session is based on. */
  role: Role;

  /** The VFS token granting this session sandboxed file access. */
  vfsToken: VfsSessionToken;

  /** The current high-level task the agent is working on. */
  currentTask: string;

  /**
   * The complete message history for this session, used for LLM context.
   * (You will likely define `ChatMessage` elsewhere).
   */
  // messageHistory: ChatMessage[];

  /** The current status of the session. */
  status: 'idle' | 'running' | 'awaiting-input' | 'completed';
}

/**
 * A type alias for the VFS session token string.
 * This string is a JWT (JSON Web Token).
 */
export type VfsSessionToken = string;

/**
 * Describes the data encoded inside the VfsSessionToken (JWT).
 * This is the "payload" of the token.
 */
export interface VfsTokenPayload {
  /** The user ID this session belongs to. */
  userId: string;

  /**
   * The sandboxed root path for the VFS.
   * The agent cannot access any files or folders *outside* this path.
   * (e.g., "workspaces/project-alpha/").
   */
  vfsRootPath: string;

  /** Standard JWT expiration timestamp (in seconds). */
  exp: number;
  /** Standard JWT issued-at timestamp (in seconds). */
  iat: number;
}

/**
 * Represents a message to be displayed in a terminal-like interface.
 */
export interface TerminalMessage {
  /** The timestamp of the message. */
  timestamp: string;
  /** The type of the message, used for color-coding and filtering. */
  type: 'info' | 'warn' | 'error' | 'command' | 'response';
  /** The content of the message. */
  message: string;
}
