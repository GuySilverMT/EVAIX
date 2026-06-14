import React, { useMemo } from 'react';
import { trpc } from '../../utils/trpc.js';
import { CompactCategorizer } from '../../features/dna-lab/components/CompactCategorizer.js';
import type { CategorizerItem } from '../../features/dna-lab/components/CompactCategorizer.js';
import { Wrench } from 'lucide-react';

interface RoleToolSelectorProps {
    selectedTools: string[]; // List of tool names
    onChange: (tools: string[]) => void;
    className?: string;
}

// Native tools that don't have database records
const NATIVE_TOOLS = [
    { name: 'ui_architect_tree_inspect', description: 'Read-only UI inspection', serverId: null },
    { name: 'ui_architect_node_mutate', description: 'Surgical UI updates', serverId: null },
    { name: 'ui_factory_layout_generate', description: 'Structural UI generation', serverId: null },
    { name: 'role_registry_list', description: 'List available personas', serverId: null },
    { name: 'role_variant_evolve', description: 'Evolve new agent DNA', serverId: null },
    { name: 'role_config_patch', description: 'Fine-tune agent behavior', serverId: null },
    { name: 'read_file', description: 'Read file contents', serverId: null },
    { name: 'write_file', description: 'Write file contents', serverId: null },
    { name: 'list_files', description: 'List directory contents', serverId: null },
    { name: 'browse', description: 'Browse web pages', serverId: null },
    { name: 'terminal_execute', description: 'Execute terminal commands', serverId: null },
    { name: 'search_codebase', description: 'Search codebase', serverId: null },
    { name: 'scan_ui_components', description: 'Scan available components', serverId: null },
];

export const RoleToolSelector: React.FC<RoleToolSelectorProps> = ({ selectedTools = [], onChange, className }) => {
    const { data: dbTools } = trpc.tool.list.useQuery();

    // 1. Infer Categories from Tool Names or serverId
    const { items, categories } = useMemo(() => {
        const cats = new Set<string>();
        
        // Merge native tools and database tools
        const allTools = [
            ...NATIVE_TOOLS.map(t => ({ ...t, isNative: true })),
            ...(dbTools || []).map(t => ({ ...t, isNative: false }))
        ];
        
        const mappedItems: CategorizerItem[] = allTools.map(t => {
            let category = t.serverId || (t.isNative ? 'Native' : 'General');
            if (!t.serverId && t.name.includes('_')) {
                 const parts = t.name.split('_');
                 category = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
            }
            cats.add(category);
            
            const isEnabled = selectedTools.includes(t.name);

            return {
                id: t.name,
                label: t.name,
                categoryId: category,
                icon: <Wrench size={12} className={isEnabled ? "text-[var(--color-primary)]" : "text-[var(--text-muted)]"} />
            };
        });
        return { items: mappedItems, categories: Array.from(cats).sort() };
    }, [dbTools, selectedTools]);

    return (
        <div className="h-full flex flex-col">
            <CompactCategorizer 
                title="Available Tools"
                items={items}
                categories={categories}
                selectedId={null} 
                selectedIds={selectedTools}
                accordion
                defaultExpanded={false}
                onSelect={(id: string) => {
                    const newSelection = selectedTools.includes(id)
                        ? selectedTools.filter(t => t !== id)
                        : [...selectedTools, id];
                    onChange(newSelection);
                }}
                onCategorySelect={(_cat: string, itemIds: string[]) => {
                    const isAllSelected = itemIds.every(id => selectedTools.includes(id));
                    if (isAllSelected) {
                        // Deselect all in category
                        onChange(selectedTools.filter(t => !itemIds.includes(t)));
                    } else {
                        // Select all in category (avoid duplicates)
                        const others = selectedTools.filter(t => !itemIds.includes(t));
                        onChange([...others, ...itemIds]);
                    }
                }}
                className={className}
            />
        </div>
    );
};
