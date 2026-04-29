import { CommunicationProtocol, CallTemplate, CallTemplateSerializer, IUtcpClient, Tool } from '@utcp/sdk';
import { z } from 'zod';

export const LocalCallTemplateSchema = z.object({
  call_template_type: z.literal('local'),
  name: z.string(),
  tools: z.array(z.any()).optional().default([]),
}).passthrough();

// Define types for Tool Definition
export interface ToolDefinition {
  name: string;
  description?: string;
  input_schema?: Record<string, unknown>;
  inputs?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  tags?: string[];
  handler?: (args: unknown) => unknown;
}

export interface ManualCallTemplate extends CallTemplate {
  name: string;
  tools?: ToolDefinition[];
  call_template_type: string;
}

export class LocalCallTemplateSerializer extends CallTemplateSerializer {
  toDict(obj: CallTemplate) { return obj as unknown as Record<string, unknown>; }
  validateDict(obj: unknown) { return LocalCallTemplateSchema.parse(obj); }
}

export class LocalCommunicationProtocol extends CommunicationProtocol {
  private handlers = new Map<string, (args: unknown) => unknown>();

  async registerManual(client: IUtcpClient, manualCallTemplate: CallTemplate) {
    const template = manualCallTemplate as ManualCallTemplate;
    const tools: Tool[] = [];
    const prefix = template.name;

    for (const toolDef of template.tools || []) {
      // Ensure tool name is fully qualified if not already
      const fullToolName = toolDef.name.includes('.') ? toolDef.name : `${prefix}.${toolDef.name}`;

      // Store handler
      if (toolDef.handler) {
        this.handlers.set(fullToolName, toolDef.handler);
      }

      tools.push({
        name: fullToolName,
        description: toolDef.description || '',
        inputs: toolDef.input_schema || toolDef.inputs || {},
        outputs: toolDef.outputs || {},
        tags: toolDef.tags || [],
        tool_call_template: {
            call_template_type: 'local',
            name: prefix
        }
      });
    }

    // Satisfy async requirement
    await Promise.resolve();

    return {
      success: true,
      manual: {
        utcp_version: '1.0.0',
        manual_version: '1.0.0',
        tools: tools
      },
      manualCallTemplate: template as unknown as CallTemplate,
      errors: []
    };
  }

  async deregisterManual(client: IUtcpClient, manualCallTemplate: CallTemplate) {
      const template = manualCallTemplate as ManualCallTemplate;
      // Cleanup handlers for this manual
      const prefix = template.name;
      for (const key of this.handlers.keys()) {
          if (key.startsWith(prefix + '.')) {
              this.handlers.delete(key);
          }
      }
      // Satisfy async requirement
      await Promise.resolve();
  }

  async callTool(client: IUtcpClient, toolName: string, args: unknown) {
    const handler = this.handlers.get(toolName);
    if (!handler) {
        throw new Error(`No local handler found for tool ${toolName}`);
    }
    return await handler(args);
  }

  async *callToolStreaming(client: IUtcpClient, toolName: string, args: unknown) {
      // For now, just yield the result of callTool as a single chunk
      const result = await this.callTool(client, toolName, args);
      yield result;
  }
}
