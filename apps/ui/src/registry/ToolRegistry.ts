import { Folder, Code, Terminal, Globe, Fingerprint, Dna, LayoutTemplate, Database, FileText, List, Search } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type ToolId = 'files' | 'editor' | 'terminal' | 'browser' | 'role' | 'dna-lab' | 'BadBuilder' | 'databrowser' | 'document-outline' | 'ai-chat' | 'research-notes';

export interface ToolDefinition {
    id: ToolId;
    icon: LucideIcon;
    label: string;
}

export const TECHNICAL_STACK: ToolDefinition[] = [
    { id: 'files', icon: Folder, label: 'File Explorer' },
    { id: 'ai-chat', icon: FileText, label: 'AI Chat' },
    { id: 'terminal', icon: Terminal, label: 'Smart Terminal' },
    { id: 'BadBuilder', icon: LayoutTemplate, label: 'BadBuilder' },
    { id: 'editor', icon: Code, label: 'Code Editor' },
    { id: 'browser', icon: Globe, label: 'Web Browser' },
    { id: 'role', icon: Fingerprint, label: 'Agent Role' },
    { id: 'dna-lab', icon: Dna, label: 'Agent DNA Lab' },
    { id: 'databrowser', icon: Database, label: 'Database Grid' },
];

export const getToolsForProjectType = (projectType: string | null): ToolDefinition[] => {
    const type = projectType?.toLowerCase() || 'coding';
    
    if (type === 'coding' || type === 'code') {
        return TECHNICAL_STACK;
    }
    
    if (type === 'deploy') {
        return TECHNICAL_STACK.filter(tool => tool.id !== 'BadBuilder');
    }
    
    if (type === 'writing') {
        return [
            { id: 'document-outline', icon: List, label: 'Document Outline' },
            { id: 'editor', icon: Code, label: 'Rich Text Editor' },
            { id: 'ai-chat', icon: FileText, label: 'AI Chat' },
            { id: 'research-notes', icon: Search, label: 'Research Notes' }
        ];
    }
    
    return TECHNICAL_STACK;
};
