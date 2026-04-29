import fs from 'fs/promises';
import path from 'path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { ProviderManager } from './ProviderManager.js';
import { LLMModel } from '../utils/BaseLLMProvider.js';

interface Tool {
  name: string;
  description?: string;
  inputSchema?: {
    type?: string;
    properties?: Record<string, any>;
    required?: string[];
  };
}

export class ToolDocumenter {
  // We'll try to resolve to the project root.
  private static get STORAGE_PATH() {
    let root = process.cwd();
    if (root.endsWith('apps/api')) {
        root = path.resolve(root, '../../');
    }
    const p = path.resolve(root, '.domoreai/tools');
    console.log('[ToolDocumenter] Storage Path:', p);
    return p;
  }

  static async documentMcpServer(serverName: string, client: Client) {
    try {
      const result = await client.listTools();
      const tools = result.tools as Tool[];
      await this.documentTools(serverName, tools);
    } catch (error) {
      console.error(`[ToolDocumenter] Failed to document server ${serverName}:`, error);
    }
  }

  static async documentTools(sourceName: string, tools: Tool[]) {
    try {
      // Ensure directory exists
      await fs.mkdir(this.STORAGE_PATH, { recursive: true });
      
      if (!tools || tools.length === 0) return;

      // Generate Comprehensive Documentation (Signatures + Examples)
      const documentation = await this.generateDocumentation(sourceName, tools);
      await fs.writeFile(path.join(this.STORAGE_PATH, `${sourceName}_examples.md`), documentation);
      
      console.log(`[ToolDocumenter] Generated documentation for ${sourceName}`);
    } catch (error) {
      console.error(`[ToolDocumenter] Failed to document tools for ${sourceName}:`, error);
    }
  }

  private static renderType(schema: any, indentLevel: number): string {
    if (!schema) return 'any';
    
    const indent = '  '.repeat(indentLevel);
    const nextIndent = '  '.repeat(indentLevel + 1);

    const type = (schema as { type?: string }).type;

    switch (type) {
      case 'string':
        if ((schema as { enum?: string[] }).enum) {
          return (schema as { enum: string[] }).enum.map((e: string) => `'${e}'`).join(' | ');
        }
        return 'string';
      case 'number':
      case 'integer':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'array':
        const itemType = this.renderType((schema as { items?: any }).items, indentLevel);
        return `(${itemType})[]`;
      case 'object':
        const properties = (schema as { properties?: Record<string, any> }).properties;
        if (!properties || Object.keys(properties).length === 0) {
          return 'Record<string, any>';
        }
        const required = (schema as { required?: string[] }).required;
        const props = Object.entries(properties).map(([key, value]: [string, any]) => {
          const isOptional = !required?.includes(key);
          const typeStr = this.renderType(value, indentLevel + 1);
          const description = (value as { description?: string }).description;
          const desc = description ? `/** ${description.replace(/\n/g, ' ')} */\n${nextIndent}` : '';
          return `${nextIndent}${desc}${key}${isOptional ? '?' : ''}: ${typeStr};`;
        });
        return `{\n${props.join('\n')}\n${indent}}`;
      default:
        const oneOf = (schema as { oneOf?: any[] }).oneOf;
        if (oneOf) {
          return oneOf.map((s: any) => this.renderType(s, indentLevel)).join(' | ');
        }
        const anyOf = (schema as { anyOf?: any[] }).anyOf;
        if (anyOf) {
          return anyOf.map((s: any) => this.renderType(s, indentLevel)).join(' | ');
        }
        return 'any';
    }
  }

  private static async generateDocumentation(serverName: string, tools: Tool[]): Promise<string> {
    const docs: string[] = [];

    // 1. Signatures Block (The "Source of Truth" for types)
    docs.push('## 🛠️ TOOL SIGNATURES');
    docs.push('```typescript');
    docs.push('declare namespace system {');
    
    for (const tool of tools) {
      const toolName = (serverName === 'system' ? tool.name : `${serverName}_${tool.name}`).replace(/\./g, '_');
      const interfaceName = `${this.capitalize(serverName)}${this.capitalize(tool.name).replace(/\./g, '_')}Args`;
      const typeDef = this.renderType(tool.inputSchema, 1);
      
      docs.push(`  /**`);
      docs.push(`   * ${tool.description || 'No description provided.'}`);
      docs.push(`   */`);
      docs.push(`  type ${interfaceName} = ${typeDef};`);
      docs.push(`  function ${toolName}(args: ${interfaceName}): Promise<any>;`);
      docs.push('');
    }
    docs.push('}');
    docs.push('```');
    docs.push('\n---\n');

    // 2. Examples Block
    let model = null;
    try {
        const allModels = await ProviderManager.getAllModels();
        const capableModels = allModels
            .filter((m: LLMModel) => ((m.specs?.contextWindow || 0) >= 32000))
            .sort((a: LLMModel, b: LLMModel) => {
                const costA = a.costPer1k || 0;
                const costB = b.costPer1k || 0;
                if (costA !== costB) return costA - costB;
                return (b.specs?.contextWindow || 0) - (a.specs?.contextWindow || 0);
            });

        model = capableModels[0] || allModels[0];
    } catch (e) {
        console.warn('[ToolDocumenter] Failed to load models for smart documentation:', e);
    }

    for (const tool of tools) {
      const toolName = (serverName === 'system' ? tool.name : `${serverName}_${tool.name}`).replace(/\./g, '_');
      
      docs.push(`### Usage: \`system.${toolName}\``);
      docs.push(`**Description:** ${tool.description || 'No description provided.'}`);
      docs.push('');

      docs.push('**Code Mode Example:**');
      docs.push('```typescript');
      
      let exampleCode = `// Example for system.${toolName}\nawait system.${toolName}({ /* ... */ });`;

      if (model) {
        try {
            const providerId = model.providerId || '';
            const provider = ProviderManager.getProvider(providerId);
            if (provider) {
                const prompt = `
                You are an expert TypeScript developer.
                I have a tool named "system.${toolName}".
                Description: ${tool.description}
                Input Schema: ${JSON.stringify(tool.inputSchema)}

                Write a realistic, executable TypeScript code block showing how to use this tool in a "Code Mode" environment.
                - Use top-level await or an async function.
                - Include comments explaining the step.
                - Do NOT wrap in markdown code blocks.
                - Keep it concise.
                `;

                const response = await provider.generateCompletion({
                    modelId: model.id,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.2,
                    max_tokens: 300
                });
                
                exampleCode = response.text.trim().replace(/^```typescript\n|^```ts\n|^```/g, '').replace(/```$/g, '');
            }
        } catch (e) {
            console.warn(`[ToolDocumenter] Failed to generate smart example for ${toolName}`, e);
        }
      }

      docs.push(exampleCode);
      docs.push('```');
      docs.push('');
      docs.push('---');
      docs.push('');
    }

    return docs.join('\n');
  }

  private static capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
}
