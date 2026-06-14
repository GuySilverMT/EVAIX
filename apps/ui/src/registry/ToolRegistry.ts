import { Folder, Code, Terminal, Globe, Fingerprint, Dna, LayoutTemplate, Database, FileText, List, Search, Settings } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type ToolId = 'files' | 'editor' | 'terminal' | 'browser' | 'role' | 'dna-lab' | 'badbuilder' | 'BadBuilder' | 'databrowser' | 'document-outline' | 'ai-chat' | 'research-notes' | 'settings';

export interface ToolDefinition {
    id: ToolId;
    icon: LucideIcon;
    label: string;
}

export const TECHNICAL_STACK: ToolDefinition[] = [
    { id: 'files', icon: Folder, label: 'File Explorer' },
    { id: 'terminal', icon: Terminal, label: 'Smart Terminal' },
    { id: 'badbuilder', icon: LayoutTemplate, label: 'BadBuilder' },
    { id: 'editor', icon: Code, label: 'Code Editor' },
    { id: 'browser', icon: Globe, label: 'Web Browser' },
    { id: 'settings', icon: Settings, label: 'Settings' }
];

export const getToolsForProjectType = (projectType: string | null): ToolDefinition[] => {
    const baseTools: ToolDefinition[] = [
        { id: 'editor', icon: Code, label: 'Code Editor' },
        { id: 'browser', icon: Globe, label: 'Web Browser' },
        { id: 'files', icon: Folder, label: 'File Explorer' },
        { id: 'settings', icon: Settings, label: 'Settings' }
    ];
    
    if (projectType === 'coding') {
        baseTools.push({ id: 'terminal', icon: Terminal, label: 'Smart Terminal' });
        baseTools.push({ id: 'badbuilder', icon: LayoutTemplate, label: 'BadBuilder' });
    }
    
    return baseTools;
};
