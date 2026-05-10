
import { ActionHandler } from './ActionHandler.js';

export interface ToolCall {
    tool: string;
    args: any;
}

export class ExecutionStrategies {
    static extractToolCalls(text: string): { type: 'json' | 'typescript'; content: string }[] {
        const results: { type: 'json' | 'typescript'; content: string }[] = [];

        // Improved regex to handle various block styles
        const blockRegex = /```(json|typescript)?\s*([\s\S]*?)```/g;
        let match;

        while ((match = blockRegex.exec(text)) !== null) {
            let lang = match[1]?.toLowerCase().trim();
            const content = match[2].trim();

            if (lang === 'json') {
                // [SAFE-PARSING] Try to extract JSON if it's wrapped in markers or conversational text within the block
                results.push({ type: 'json', content });
            } else if (lang === 'typescript' || !lang) {
                // Only classify as typescript if it looks like code and not just text
                // or if it explicitly says typescript
                if (lang === 'typescript' || /^(import|const|let|var|function|class|await|system|nebula|ast)\b/m.test(content)) {
                    results.push({ type: 'typescript', content });
                }
            }
        }

        // Fallback if no blocks found but text looks like JSON tool call or TypeScript
        if (results.length === 0) {
            const trimmed = text.trim();
            if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
                try {
                    JSON.parse(trimmed);
                    results.push({ type: 'json', content: trimmed });
                } catch (e) { }
            } else if (/^(import|const|let|var|function|class|await|system|nebula|ast)\b/m.test(trimmed)) {
                results.push({ type: 'typescript', content: trimmed });
            }
        }

        return results;
    }

    static identifyStrategy(block: { type: string, content: string }): 'JSON_NATIVE' | 'TS_SANDBOX' {
        if (block.type === 'json') return 'JSON_NATIVE';
        return 'TS_SANDBOX';
    }

    async executeNative(tool: string, args: any): Promise<string> {
        // This will be mocked in tests
        return `Executed ${tool} with ${JSON.stringify(args)}`;
    }
}
