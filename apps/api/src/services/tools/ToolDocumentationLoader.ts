import fs from 'fs/promises';
import path from 'path';

export interface ToolDocs {
    signatures: string;
    fullDocs: string;
}

export async function loadToolDocs(
    tools: string[]
): Promise<ToolDocs> {
    // Resolve path to .domoreai/tools
    let rootDir = process.cwd();
    if (rootDir.endsWith('apps/api')) {
        rootDir = path.resolve(rootDir, '../../');
    }
    const toolsDir = path.join(rootDir, '.domoreai/tools');

    const signatureParts: string[] = [];
    const exampleParts: string[] = [];

    // Load requested toolsets
    for (const toolRequest of tools) {
        let content = "";
        try {
            content = await fs.readFile(path.join(toolsDir, `${toolRequest}_examples.md`), 'utf-8');
        } catch {
            try {
                content = await fs.readFile(path.join(toolsDir, `${toolRequest}.md`), 'utf-8');
            } catch {
                continue;
            }
        }

        if (content) {
            // Split by SIGNATURES header if exists
            const sigMatch = content.match(/## 🛠️ TOOL SIGNATURES\n([\s\S]*?)(?=\n---|\n### Usage|\n##|$)/);
            if (sigMatch) {
                signatureParts.push(sigMatch[1].trim());
                
                // The rest is examples
                const examples = content.replace(sigMatch[0], "").trim();
                if (examples) exampleParts.push(examples);
            } else {
                // If no signatures header, treat entire thing as full docs, signatures empty or extracted simply
                // For MCP servers we might not have the header yet
                exampleParts.push(content);
            }
        }
    }

    return {
        signatures: signatureParts.join('\n\n'),
        fullDocs: exampleParts.join('\n\n---\n\n')
    };
}
