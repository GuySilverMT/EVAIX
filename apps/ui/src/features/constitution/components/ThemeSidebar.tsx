import { useState } from 'react';
import { useThemeContext } from '../../../theme/ThemeProvider.js';
import { Palette, Type, LayoutGrid, X, Save, RefreshCw, Hash } from 'lucide-react';
import { cn } from '../../../lib/utils.js';
import { IconSelector } from './primitives/IconSelector.js';

export const ThemeSidebar = ({ onClose }: { onClose: () => void }) => {
    const { theme, setTheme, resetToDefault } = useThemeContext();
    const [activeSection, setActiveSection] = useState<'colors' | 'type' | 'icons'>('colors');
    const [filter, setFilter] = useState('');

    // Recursive flattener to get all editable keys
    const flattenColors = (obj: Record<string, unknown> | object, prefix = ''): { key: string, value: string, path: string[] }[] => {
        if (!obj || typeof obj !== 'object') return [];
        return Object.entries(obj).flatMap(([k, v]) => {
            if (typeof v === 'string') return [{ key: prefix + k, value: v, path: [k] }];
            if (v && typeof v === 'object') return flattenColors(v as Record<string, unknown> | object, `${prefix}${k}.`).map(i => ({ ...i, path: [k, ...i.path] }));
            return [];
        });
    };

    const allColors = flattenColors(theme.colors);
    const filteredColors = allColors.filter(c => c.key.toLowerCase().includes(filter.toLowerCase()));

    const updateColor = (path: string[], value: string) => {
        const newColors = JSON.parse(JSON.stringify(theme.colors));
        let current = newColors;
        for (let i = 0; i < path.length - 1; i++) {
            current = current[path[i]];
        }
        current[path[path.length - 1]] = value;
        setTheme({ colors: newColors });
    };

    return (
        <div className="h-full flex flex-col bg-[var(--bg-secondary)] text-[var(--text-primary)]">
            {/* Header */}
            <div className="flex-none h-10 flex items-center justify-between px-3 border-b border-[var(--border-color)]">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Theme Engine v3</span>
                <button onClick={onClose}><X size={14} className="hover:text-[var(--text-primary)] transition-colors"/></button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
                <Tab icon={Palette} active={activeSection === 'colors'} onClick={() => setActiveSection('colors')} />
                <Tab icon={Type} active={activeSection === 'type'} onClick={() => setActiveSection('type')} />
                <Tab icon={LayoutGrid} active={activeSection === 'icons'} onClick={() => setActiveSection('icons')} />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                
                {/* 1. RAW COLOR EDITOR */}
                {activeSection === 'colors' && (
                    <div className="flex flex-col min-h-full">
                        <div className="p-2 border-b border-[var(--border-color)] sticky top-0 bg-[var(--bg-secondary)] z-10">
                            <div className="relative">
                                <Hash size={10} className="absolute left-2 top-2 text-[var(--text-muted)]"/>
                                <input 
                                    value={filter}
                                    onChange={e => setFilter(e.target.value)}
                                    placeholder="Filter variables..."
                                    className="w-full bg-[var(--bg-background)] border border-[var(--border-color)] rounded h-7 pl-6 text-[10px] focus:border-[var(--color-primary)] outline-none font-mono"
                                />
                            </div>
                        </div>

                        <div className="divide-y divide-[var(--border-color)]">
                            {filteredColors.map((item) => (
                                <div key={item.key} className="flex items-center justify-between p-2 hover:bg-[var(--bg-primary)] group">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-mono text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">{item.key}</span>
                                        <span className="text-[9px] text-[var(--text-muted)] uppercase">{item.value}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded border border-[var(--border-color)] overflow-hidden relative">
                                            <input 
                                                type="color" 
                                                value={item.value}
                                                onChange={(e) => updateColor(item.path, e.target.value)}
                                                className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer p-0 border-0"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 2. TYPOGRAPHY */}
                {activeSection === 'type' && (
                    <div className="p-4 space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Heading Font</label>
                            <input 
                                value={theme.assets.fonts.mappings.heading}
                                onChange={e => setTheme({ assets: { ...theme.assets, fonts: { ...theme.assets.fonts, mappings: { ...theme.assets.fonts.mappings, heading: e.target.value } } } })}
                                className="w-full bg-[var(--bg-background)] border border-[var(--border-color)] p-2 rounded text-[10px] font-mono"
                            />
                        </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Body Font</label>
                            <input 
                                value={theme.assets.fonts.mappings.body}
                                onChange={e => setTheme({ assets: { ...theme.assets, fonts: { ...theme.assets.fonts, mappings: { ...theme.assets.fonts.mappings, body: e.target.value } } } })}
                                className="w-full bg-[var(--bg-background)] border border-[var(--border-color)] p-2 rounded text-[10px] font-mono"
                            />
                        </div>
                    </div>
                )}

                 {/* 3. ICONS */}
                {activeSection === 'icons' && (
                    <div className="h-full flex flex-col">
                <IconSelector 
                    currentMap={theme.assets.icons?.tokenMap || {}}
                    onChange={(token, iconName) => {
                                 setTheme({ ...theme, assets: { ...theme.assets, icons: { ...theme.assets.icons, tokenMap: { ...theme.assets.icons.tokenMap, [token]: iconName } } } })
                             }}
                         />
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-2 border-t border-[var(--border-color)] flex gap-2">
                <button onClick={resetToDefault} className="p-2 text-[var(--text-muted)] hover:text-white" title="Reset"><RefreshCw size={14} /></button>
                <button className="flex-1 bg-[var(--color-primary)] text-white text-[10px] font-bold py-2 rounded flex items-center justify-center gap-2 hover:brightness-110">
                    <Save size={12} /> SAVE CONFIG
                </button>
            </div>
        </div>
    );
};

const Tab = ({ icon: Icon, active, onClick }: { icon: React.ElementType, active: boolean, onClick: () => void }) => (
    <button onClick={onClick} className={cn("flex-1 py-2 flex justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors", active && "text-[var(--color-primary)] border-b-2 border-[var(--color-primary)] bg-[var(--bg-secondary)]")}>
        <Icon size={14} />
    </button>
);
