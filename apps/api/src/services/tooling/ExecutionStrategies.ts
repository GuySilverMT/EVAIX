import { CodeModeUtcpClient } from "@utcp/code-mode";

export interface ExecutionResult {
  output: string;
  logs: string[];
}

export interface AgentContext {
  roleId?: string;
  sessionId?: string;
  traceId?: string;
  spanId?: string;
  baggage?: Record<string, string>;
}

export interface IExecutionStrategy {
  name: string;
  /**
   * Returns true if this strategy can handle the given response text
   */
  canHandle(response: string): boolean;

  /**
   * Parses and executes the action, returning standard logs/results
   */
  execute(response: string, context: AgentContext): Promise<ExecutionResult>;
}

export class CodeModeStrategy implements IExecutionStrategy {
  public name = "CodeModeStrategy";

  constructor(private client: CodeModeUtcpClient) {}

  static canHandle(response: string): boolean {
    const codeBlockRegex = /```(?:[a-zA-Z0-9]+)?\s*\n?([\s\S]*?)```/g;
    if (codeBlockRegex.test(response)) return true;
    
    // Fallback: If no blocks but looks like code
    if (/^(?:import|const|let|var|function|class|await|system\.|nebula\.)/m.test(response.trim())) {
      return true;
    }
    
    return false;
  }

  canHandle(response: string): boolean {
    return CodeModeStrategy.canHandle(response);
  }

  private detectLanguageViolation(response: string): string | null {
    const trimmedResponse = response.trim();

    // Check for Python indicators (including def at line start)
    if (/(^|\s)(def\s+\w+\s*\(|import\s+(os|sys|json|requests|numpy|pandas)|pip\s+install|print\(|requirements\.txt)/m.test(trimmedResponse)) {
      return "Python code detected.";
    }

    // Check for manual thought logs (often seen in LLM responses)
    if (/\b(Thought|Thinking|Plan|Action|Observation|Final Answer):\s*/i.test(trimmedResponse)) {
      return "Manual thought logs detected.";
    }

    // Check for non-TypeScript/JavaScript specific keywords in code blocks
    const codeBlocks = [...trimmedResponse.matchAll(/```(?:[a-zA-Z0-9]+)?\s*\n?([\s\S]*?)```/g)]
      .map(match => match[1].trim());

    for (const block of codeBlocks) {
      if (/(^|\s)(def\s+\w+\s*\(|print\(|import\s+(os|sys|json|requests|numpy|pandas))/m.test(block)) {
        return "Python code detected within a code block.";
      }
      // Add more language-specific checks if needed
    }

    return null; // No violation detected
  }

  async execute(response: string, _context: AgentContext): Promise<ExecutionResult> {
    console.log(`[AgentRuntime] ⚡ Executing code via CodeModeStrategy...`);
    
    // 🛡️ LANGUAGE GUARDRAILS: Detect and reject non-TypeScript code
    const languageViolation = this.detectLanguageViolation(response);
    if (languageViolation) {
      console.error(`[CodeModeStrategy] 🚫 Language violation detected: ${languageViolation}`);
      return {
        output: `CONSTRAINT_VIOLATION: ${languageViolation}\n\n` +
                `This environment ONLY supports TypeScript/Node.js.\n` +
                `Forbidden: Python, pip, requirements.txt, manual thought logs.\n` +
                `Required: Use TypeScript syntax with async/await and system.* tools.`,
        logs: [`Language violation: ${languageViolation}`]
      };
    }
    
    // 1. Extract Code
    const codeBlockRegex = /```(?:[a-zA-Z0-9]+)?\s*\n?([\s\S]*?)```/g;
    let match;
    const blocks: string[] = [];
    while ((match = codeBlockRegex.exec(response)) !== null) {
      if (match[1].trim()) blocks.push(match[1].trim());
    }

    let codeToExecute = blocks.join("\n\n");
    if (!codeToExecute && /^(?:import|const|let|var|function|class|await|system\.|nebula\.)/m.test(response.trim())) {
      codeToExecute = response;
    }

    // 2. Sanitize "Thinking" lines (LOCATE/DEFINE/EXECUTE)
    if (codeToExecute) {
      codeToExecute = codeToExecute
        .split("\n")
        .filter((l) => !/^\s*(\d+\.\s+)?(LOCATE|DEFINE|EXECUTE):/.test(l))
        .join("\n");
    }

    if (!codeToExecute || codeToExecute.trim().length === 0) {
      return { output: "Error: No executable code found.", logs: [] };
    }

    let turnResult = "";
    let turnLogs: string[] = [];

    try {
      // Check if we should use the specialized TypeScript interpreter for Nebula Code Mode
      const useSpecializedInterpreter =
        codeToExecute.includes("nebula.") || codeToExecute.includes("ast.");

      if (useSpecializedInterpreter) {
        console.log("[AgentRuntime] Using specialized Nebula Code Mode interpreter...");
        const { typescriptInterpreterTool } = await import("../../tools/typescriptInterpreter.js");
        const interpreterResponse = await (
          typescriptInterpreterTool.handler as (args: {
            code: string;
          }) => Promise<{ text: string; meta?: { nebula_actions?: unknown[] } }[]>
        )({ code: codeToExecute });

        const firstMessage = interpreterResponse[0];
        const responseText = firstMessage?.text || "";
        const actions = firstMessage?.meta?.nebula_actions || [];

        if (responseText.includes("❌ Execution Error:") || responseText.includes("ERROR:")) {
          throw new Error(responseText);
        }

        const toolResults: unknown[] = [];
        if (actions.length > 0) {
          console.log(`[AgentRuntime] Executing ${actions.length} captured Nebula actions...`);
          for (const action of actions) {
            const toolOutput = (await this.client.callTool(
              "system.nebula",
              action as Record<string, unknown>
            )) as unknown;
            toolResults.push(toolOutput);
          }
        }

        const outputMatch = responseText.match(/Output:\n([\s\S]*?)(?:\nWarnings\/Errors:|$)/);
        const parsedResult = outputMatch ? outputMatch[1].trim() : responseText;

        const combinedResult = [
          { type: "text", content: parsedResult },
          ...toolResults,
        ];

        turnResult = JSON.stringify(combinedResult);
        turnLogs = [responseText];
      } else {
        // Standard Sandbox Execution
        // [OTEL] Propagate traceId and baggage if available
        const sandboxResponse = (await this.client.callToolChain(codeToExecute, {
           traceId: _context.traceId,
           spanId: _context.spanId,
           baggage: _context.baggage
        } as any)) as {
          result: string;
          logs: string[];
        };
        turnResult = sandboxResponse?.result || "Command executed successfully with no output.";
        turnLogs = sandboxResponse?.logs || [];
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      turnResult = `Error: ${errorMessage}`;
      turnLogs = [turnResult];
    }

    return { output: turnResult, logs: turnLogs };
  }
}

export class JsonRpcStrategy implements IExecutionStrategy {
  public name = "JsonRpcStrategy";

  constructor(private client: CodeModeUtcpClient) {}

  static canHandle(response: string): boolean {
    const trimmed = response.trim();
    
    // 1. Check for raw JSON (even if surrounded by text)
    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
        const potentialJson = trimmed.substring(firstBrace, lastBrace + 1);
        if (potentialJson.includes('"tool":')) return true;
    }
    
    // 2. Check for JSON in ```json blocks
    const jsonBlockMatch = trimmed.match(/```json\s*\n([\s\S]*?)```/);
    if (jsonBlockMatch) {
      const extracted = jsonBlockMatch[1].trim();
      return extracted.startsWith("{") && extracted.includes('"tool":');
    }
    
    return false;
  }

  canHandle(response: string): boolean {
    return JsonRpcStrategy.canHandle(response);
  }

  async execute(response: string, _context: AgentContext): Promise<ExecutionResult> {
    console.log(`[AgentRuntime] 🔀 Routing to JsonRpcStrategy`);
    let turnResult = "";
    let turnLogs: string[] = [];

    try {
      const { VolcanoAgent } = await import("../VolcanoAgent.js");
      const json = VolcanoAgent.parseResponse(response) as { tool?: string; args?: Record<string, unknown> };
      const toolName = json.tool;
      const args = json.args || {};

      if (!toolName) {
        throw new Error("Missing 'tool' field in JSON RPC call.");
      }

      console.log(`[AgentRuntime] ⚡ Executing JSON tool call: ${toolName}`);
      const toolOutput = (await (this.client as any).callTool(toolName, args, {
          traceId: _context.traceId,
          spanId: _context.spanId,
          baggage: _context.baggage
      })) as unknown;
      
      turnResult = typeof toolOutput === "string" ? toolOutput : JSON.stringify(toolOutput);
      turnLogs = [`Executed tool ${toolName} with output: ${turnResult}`];
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      turnResult = `Error: ${errorMessage}`;
      turnLogs = [turnResult];
    }

    return { output: turnResult, logs: turnLogs };
  }
}
