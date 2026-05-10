import React, { useState, useEffect, useCallback } from 'react';
import { 
  Palette, Type, Save, Trash2, Image as ImageIcon, LayoutTemplate 
} from 'lucide-react';
import { useThemeContext } from '../../../theme/ThemeProvider.js';
import { ThemeStorage } from '../../../theme/ThemeStorage.js';
import type { Theme } from '../../../theme/types.js';
import { TokenIcon } from './TokenIcon.js';
import { SuperAiButton } from '../../../components/ui/SuperAiButton.js'; // AI Injection
import { toast } from 'sonner';

import type { LucideIcon } from 'lucide-react';

// --- Sub-components for cleanliness ---
const SectionHeader = ({ icon: Icon, title }: { icon: LucideIcon, title: string }) => (
  <div className="flex items-center gap-2 mb-4 pb-2 border-b border-zinc-800">
    <Icon size={14} className="text-indigo-400" />
    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{title}</span>
  </div>
);

const InputGroup = ({ label, children }: { label: string, children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <label className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">{label}</label>
    {children}
  </div>
);

export const ThemeManager = () => {
  const { theme, setTheme } = useThemeContext();
  const [savedThemes, setSavedThemes] = useState<Theme[]>([]);
  const [activeTab, setActiveTab] = useState<'visual' | 'fonts' | 'icons' | 'library' | 'components'>('visual');

  // Load themes on mount
  useEffect(() => {
    setSavedThemes(ThemeStorage.getAll());
  }, []);

  // --- Handlers ---

  const handleSave = () => {
    const newTheme = { ...theme, id: `custom-${Date.now()}`, name: `${theme.name} (Copy)`, timestamp: Date.now() };
    ThemeStorage.save(newTheme);
    setSavedThemes(ThemeStorage.getAll());
    setTheme(newTheme);
    toast.success("Theme Snapshot Saved");
  };

  const handleLoad = (t: Theme) => {
    setTheme(t);
    toast.success(`Loaded Theme: ${t.name}`);
  };

  const handleFontImport = (url: string) => {
    if (!url) return;
    const newUrls = [...(theme.assets.fonts.urls || []), url];
    setTheme({
      ...theme,
      assets: {
        ...theme.assets,
        fonts: { ...theme.assets.fonts, urls: newUrls }
      }
    });
    const link = document.createElement('link');
    link.href = url;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    toast.success("Font Linked Successfully");
  };

  // --- AI Context ---
  const getAiContext = useCallback(() => {
    return {
      contextType: 'theme_manager',
      activeTab,
      currentTheme: theme,
      availableThemes: savedThemes.map(t => t.name),
      instruction: "You are the Nebula Theme Engine. You can modify the JSON structure of the theme to change colors, spacing, and component physics."
    };
  }, [theme, activeTab, savedThemes]);

  const handleAiAction = (response: unknown) => {
      // If the AI returns a patched theme, apply it
      if (response && typeof response === 'object' && 'theme' in response) {
          setTheme((response as { theme: Theme }).theme);
          toast.success("AI Applied Theme Updates");
      }
  };

  return (
    <div className="flex h-full bg-zinc-950 text-zinc-200 overflow-hidden rounded-xl border border-zinc-800">
      
      {/* Sidebar: Tabs */}
      <div className="w-14 flex flex-col items-center py-4 gap-3 border-r border-zinc-800 bg-zinc-900/50 shrink-0">
        {[
          { id: 'visual' as const, icon: Palette, label: 'Visual' },
          { id: 'components' as const, icon: LayoutTemplate, label: 'Components' },
          { id: 'fonts' as const, icon: Type, label: 'Fonts' },
          { id: 'icons' as const, icon: ImageIcon, label: 'Icons' },
          { id: 'library' as const, icon: Save, label: 'Library' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`p-2.5 rounded-lg transition-all ${
              activeTab === tab.id 
                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50' 
                : 'text-zinc-500 border border-transparent hover:bg-zinc-800 hover:text-zinc-300'
            }`}
            title={tab.label}
          >
            <tab.icon size={18} />
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Header */}
        <div className="h-12 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-900/30 shrink-0">
          <div className="flex flex-col justify-center">
            <h2 className="font-bold text-xs text-zinc-100 uppercase tracking-wide">{theme.name}</h2>
            <p className="text-[9px] text-zinc-600 font-mono">{theme.id}</p>
          </div>
          <div className="flex items-center gap-3">
             {/* AI Agent Button */}
             <SuperAiButton 
                contextGetter={getAiContext}
                onSuccess={handleAiAction}
                defaultRoleId="nebula-designer"
                className="z-50"
             />
             <div className="h-4 w-px bg-zinc-800" />
             <button 
                onClick={handleSave} 
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 hover:text-white text-zinc-400 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-all"
             >
               <Save size={12} /> Save
             </button>
          </div>
        </div>

        {/* Scrollable Editor Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar bg-zinc-950/50">

          {/* === TAB: VISUAL (Colors & Gradients) === */}
          {activeTab === 'visual' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <SectionHeader icon={Palette} title="Colors & Gradients" />
              
              <div className="grid grid-cols-2 gap-6">
                <InputGroup label="Primary Color">
                  <div className="flex gap-2 h-8">
                    <input type="color" value={theme.colors.primary} 
                      onChange={e => setTheme({ ...theme, colors: { ...theme.colors, primary: e.target.value } })}
                      className="h-full w-10 rounded cursor-pointer bg-transparent border border-zinc-700 p-0.5" 
                    />
                    <input type="text" value={theme.colors.primary} className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-3 text-xs font-mono text-zinc-300 focus:border-indigo-500 outline-none" readOnly />
                  </div>
                </InputGroup>
                
                <InputGroup label="Background">
                    <div className="flex gap-2 h-8">
                        <input type="color" value={theme.colors.background} 
                            onChange={e => setTheme({ ...theme, colors: { ...theme.colors, background: e.target.value } })}
                            className="h-full w-10 rounded cursor-pointer bg-transparent border border-zinc-700 p-0.5" 
                        />
                        <input type="text" value={theme.colors.background} className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-3 text-xs font-mono text-zinc-300 focus:border-indigo-500 outline-none" readOnly />
                    </div>
                </InputGroup>
              </div>

              <div className="pt-6 border-t border-zinc-800/50">
                <InputGroup label="Global Gradient (CSS)">
                   <textarea 
                      value={theme.gradients.primary}
                      onChange={e => setTheme({ ...theme, gradients: { ...theme.gradients, primary: e.target.value, enabled: true } })}
                      className="w-full h-24 bg-zinc-900 border border-zinc-700 rounded p-3 text-xs font-mono text-zinc-300 focus:border-indigo-500 outline-none resize-none leading-relaxed"
                      placeholder="linear-gradient(135deg, ...)"
                   />
                   <div className="mt-2 h-8 w-full rounded border border-zinc-800/50" style={{ background: theme.gradients.primary }}></div>
                </InputGroup>
              </div>
            </div>
          )}

          {/* === TAB: COMPONENTS (Physics & Layout) === */}
          {activeTab === 'components' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <SectionHeader icon={LayoutTemplate} title="Component Physics" />
              
              {/* Menu Bar Configuration */}
              <div className="p-4 rounded border border-zinc-800/50 bg-zinc-900/20">
                  <h3 className="text-[10px] font-bold text-zinc-400 mb-4 uppercase tracking-widest border-b border-zinc-800/50 pb-2">Menu Bar</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <InputGroup label="Height">
                        <input type="text" 
                        value={theme.components.menuBar.height}
                        onChange={e => setTheme({ ...theme, components: { ...theme.components, menuBar: { ...theme.components.menuBar, height: e.target.value } } })}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-xs text-zinc-300 focus:border-indigo-500 outline-none"
                        />
                    </InputGroup>
                    <InputGroup label="Background (RGBA)">
                        <input type="text" 
                        value={theme.components.menuBar.background}
                        onChange={e => setTheme({ ...theme, components: { ...theme.components, menuBar: { ...theme.components.menuBar, background: e.target.value } } })}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-xs text-zinc-300 focus:border-indigo-500 outline-none"
                        />
                    </InputGroup>
                  </div>
              </div>

              {/* Floating Nav Configuration */}
              <div className="p-4 rounded border border-zinc-800/50 bg-zinc-900/20">
                  <h3 className="text-[10px] font-bold text-zinc-400 mb-4 uppercase tracking-widest border-b border-zinc-800/50 pb-2">Floating Navigation</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <InputGroup label="Button Size">
                        <input type="text" 
                        value={theme.components.floatingNav.buttonSize}
                        onChange={e => setTheme({ ...theme, components: { ...theme.components, floatingNav: { ...theme.components.floatingNav, buttonSize: e.target.value } } })}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-xs text-zinc-300 focus:border-indigo-500 outline-none"
                        />
                    </InputGroup>
                    <InputGroup label="Icon Size">
                        <input type="text" 
                        value={(theme.components.floatingNav as Theme['components']['floatingNav'] & { iconSize?: string }).iconSize || '20px'}
                        onChange={e => setTheme({ ...theme, components: { ...theme.components, floatingNav: { ...theme.components.floatingNav, iconSize: e.target.value } as Theme['components']['floatingNav'] } })}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-xs text-zinc-300 focus:border-indigo-500 outline-none"
                        placeholder="e.g. 20px"
                        />
                    </InputGroup>
                    <InputGroup label="Border Radius">
                        <input type="text" 
                        value={theme.components.floatingNav.radius}
                        onChange={e => setTheme({ ...theme, components: { ...theme.components, floatingNav: { ...theme.components.floatingNav, radius: e.target.value } } })}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-xs text-zinc-300 focus:border-indigo-500 outline-none"
                        />
                    </InputGroup>
                    <InputGroup label="Bottom Offset">
                        <input type="text" 
                        value={theme.components.floatingNav.offsetBottom}
                        onChange={e => setTheme({ ...theme, components: { ...theme.components, floatingNav: { ...theme.components.floatingNav, offsetBottom: e.target.value } } })}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-xs text-zinc-300 focus:border-indigo-500 outline-none"
                        />
                    </InputGroup>
                    <InputGroup label="Left Offset">
                         <input type="text" 
                        value={(theme.components.floatingNav as Theme['components']['floatingNav'] & { offsetLeft?: string }).offsetLeft || '2rem'}
                        onChange={e => setTheme({ ...theme, components: { ...theme.components, floatingNav: { ...theme.components.floatingNav, offsetLeft: e.target.value } as Theme['components']['floatingNav'] } })}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-xs text-zinc-300 focus:border-indigo-500 outline-none"
                        />
                    </InputGroup>
                  </div>
              </div>
            </div>
          )}

          {/* === TAB: FONTS (Import & Assign) === */}
          {activeTab === 'fonts' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <SectionHeader icon={Type} title="Typography System" />

              {/* 1. Import */}
              <div className="bg-zinc-900/50 p-4 rounded border border-zinc-800 space-y-3">
                 <h4 className="text-[10px] font-bold text-zinc-300 uppercase tracking-wide">Import Web Font</h4>
                 <div className="flex gap-2">
                    <input id="fontUrl" type="text" placeholder="https://fonts.googleapis.com/css2?family=..." 
                       className="flex-1 bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-xs text-white focus:border-indigo-500 outline-none"
                    />
                    <button 
                       onClick={() => {
                           const el = document.getElementById('fontUrl') as HTMLInputElement;
                           if (el) handleFontImport(el.value);
                       }}
                       className="px-4 bg-indigo-600 hover:bg-indigo-500 rounded text-[10px] font-bold uppercase tracking-wider text-white transition-colors"
                    >
                      Import
                    </button>
                 </div>
              </div>

              {/* 2. Assign */}
              <div className="grid grid-cols-1 gap-4">
                 {(['heading', 'body', 'mono'] as const).map(variant => (
                   <InputGroup key={variant} label={`${variant} Font Family`}>
                      <input 
                        type="text" 
                        value={theme.assets.fonts.mappings[variant]} 
                        onChange={e => setTheme({
                          ...theme,
                          assets: {
                             ...theme.assets,
                             fonts: {
                               ...theme.assets.fonts,
                               mappings: { ...theme.assets.fonts.mappings, [variant]: e.target.value }
                             }
                          }
                        })}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-xs text-white focus:border-indigo-500 outline-none"
                        placeholder="e.g. 'Inter', sans-serif"
                      />
                   </InputGroup>
                 ))}
              </div>
            </div>
          )}

          {/* === TAB: ICONS (Variable Mapping) === */}
          {activeTab === 'icons' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
               <SectionHeader icon={ImageIcon} title="Icon Token Map" />
               <p className="text-[10px] text-zinc-500 mb-4 leading-relaxed max-w-lg">
                 Semantic actions (e.g. <span className="text-zinc-400 font-mono">action.save</span>) are mapped to abstract icon tokens. 
                 Paste an SVG path below to override the system default for any token.
               </p>

               <div className="space-y-2">
                {Object.entries(theme.assets.icons.tokenMap).map(([token, iconName]) => (
                    <div key={token} className="flex items-center gap-4 p-3 bg-zinc-900/30 border border-zinc-800/50 rounded-lg group hover:border-zinc-700 transition-colors">
                        <div className="w-8 h-8 flex items-center justify-center bg-zinc-950 border border-zinc-800 rounded text-indigo-400 group-hover:text-white group-hover:border-indigo-500/50 transition-all">
                        <TokenIcon token={token} size={14} />
                        </div>
                        <div className="flex-1">
                        <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-1.5">{token}</div>
                        <input 
                            type="text" 
                            value={iconName}
                            onChange={e => setTheme({
                            ...theme,
                            assets: {
                                ...theme.assets,
                                icons: {
                                ...theme.assets.icons,
                                tokenMap: { ...theme.assets.icons.tokenMap, [token]: e.target.value }
                                }
                            }
                            })}
                            className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1.5 text-[10px] font-mono text-zinc-300 focus:border-indigo-500 outline-none"
                        />
                        </div>
                    </div>
                ))}
               </div>
               
               <button className="w-full py-3 border border-dashed border-zinc-800 text-zinc-500 text-[10px] font-bold uppercase tracking-widest rounded hover:bg-zinc-900 hover:text-zinc-300 hover:border-zinc-700 transition-all">
                 + Add Custom SVG Token
               </button>
            </div>
          )}

          {/* === TAB: LIBRARY (Save/Load) === */}
          {activeTab === 'library' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
               <SectionHeader icon={Save} title="Theme Library" />
               
               <div className="grid grid-cols-1 gap-3">
                 {savedThemes.map(t => (
                   <div 
                     key={t.id}
                     onClick={() => handleLoad(t)}
                     className={`group flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                       theme.id === t.id 
                         ? 'bg-indigo-500/10 border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.1)]' 
                         : 'bg-zinc-900/30 border-zinc-800 hover:bg-zinc-800'
                     }`}
                   >
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded shadow-inner border border-white/5 relative overflow-hidden">
                            <div className="absolute inset-0" style={{ background: t.gradients.enabled ? t.gradients.primary : t.colors.primary }} />
                         </div>
                         <div>
                            <div className="text-xs font-bold text-zinc-200 group-hover:text-indigo-400 transition-colors uppercase tracking-wide">{t.name}</div>
                            <div className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold mt-0.5">{t.mode} • {new Date(t.timestamp).toLocaleDateString()}</div>
                         </div>
                      </div>
                      
                      {t.id.startsWith('custom-') && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); ThemeStorage.delete(t.id); setSavedThemes(ThemeStorage.getAll()); }}
                          className="p-2 text-zinc-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete Theme"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                   </div>
                 ))}
               </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
