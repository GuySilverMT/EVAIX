import React, { useState } from 'react';
import * as LucideIcons from 'lucide-react'; 
import { Search, HelpCircle } from 'lucide-react';

// For this primitive, we assume we have a list of valid icon names
// In a real app, you might lazily load these
const AVAILABLE_ICONS = Object.keys(LucideIcons).filter(k => k !== 'icons' && k !== 'createLucideIcon'); 

interface IconSelectorProps {
    currentMap: Record<string, string>; // { "action.save": "Save" }
    onChange: (token: string, iconName: string) => void;
}

export const IconSelector: React.FC<IconSelectorProps> = ({ currentMap, onChange }) => {
    const [selectedToken, setSelectedToken] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    const filteredIcons = AVAILABLE_ICONS.filter(i => i.toLowerCase().includes(search.toLowerCase())).slice(0, 100); // Limit render

    if (!selectedToken) {
        // Mode 1: Select Token to Edit
        return (
            <div className="space-y-1">
                {Object.entries(currentMap).map(([token, iconName]) => {
                    const IconComp = (LucideIcons as unknown as Record<string, React.ElementType>)[iconName] || HelpCircle;
                    return (
                        <button 
                            key={token} 
                            type="button"
                            onClick={() => setSelectedToken(token)}
                            className="w-full flex items-center gap-3 p-2 rounded hover:bg-[var(--bg-primary)] text-left group border border-transparent hover:border-[var(--border-color)]"
                        >
                            <div className="w-8 h-8 flex items-center justify-center bg-[var(--bg-background)] rounded text-[var(--color-primary)] group-hover:scale-110 transition-transform">
                                <IconComp size={16} />
                            </div>
                            <div className="flex-1">
                                <div className="text-[10px] font-bold text-[var(--text-secondary)]">{token}</div>
                                <div className="text-[9px] font-mono text-[var(--text-muted)]">{iconName}</div>
                            </div>
                        </button>
                    )
                })}
            </div>
        );
    }

    // Mode 2: Select Icon for Token
    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 mb-2">
                <button type="button" onClick={() => setSelectedToken(null)} className="text-[10px] underline text-[var(--text-muted)]">Back</button>
                <span className="text-[10px] font-bold text-[var(--color-primary)]">Editing: {selectedToken}</span>
            </div>
            
            <div className="relative mb-2">
                <Search size={10} className="absolute left-2 top-1.5 text-[var(--text-muted)]" />
                <input 
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search icons..." 
                    className="w-full bg-[var(--bg-background)] border border-[var(--border-color)] rounded h-6 pl-6 text-[10px] outline-none focus:border-[var(--color-primary)]"
                />
            </div>

            <div className="grid grid-cols-5 gap-2 overflow-y-auto custom-scrollbar p-1 max-h-[300px]">
                {filteredIcons.map(iconName => {
                    const IconComp = (LucideIcons as unknown as Record<string, React.ElementType>)[iconName];
                    if (!IconComp) return null;
                    return (
                        <button 
                            key={iconName}
                            type="button"
                            onClick={() => { onChange(selectedToken, iconName); setSelectedToken(null); }}
                            className="aspect-square flex flex-col items-center justify-center bg-[var(--bg-background)] border border-[var(--border-color)] rounded hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
                            title={iconName}
                        >
                            <IconComp size={16} />
                        </button>
                    )
                })}
            </div>
        </div>
    );
};
