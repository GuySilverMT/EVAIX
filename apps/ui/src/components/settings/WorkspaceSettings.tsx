import { useState } from 'react';
import { Save, Folder, FileText, Shield } from 'lucide-react';
import { SuperAiButton } from '../ui/SuperAiButton.js';

export const WorkspaceSettings = () => {
  // Local state for paths
  const [rulesPath, setRulesPath] = useState('.system/coding_rules.md');
  const [glossaryPath, setGlossaryPath] = useState('.system/glossary.md');

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8 text-zinc-200">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Folder className="text-blue-500" />
            Project Directory Settings
          </h2>
          <p className="text-sm text-zinc-500 mt-1">
            Configure how the AI interacts with this specific project root.
          </p>
        </div>
        <SuperAiButton contextId="workspace_settings" />
      </div>

      {/* Constitution Loading Area */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-2 text-purple-400 border-b border-zinc-800 pb-2">
          <Shield size={20} />
          <h3 className="font-bold text-lg">Constitution & Laws</h3>
        </div>
        
        <p className="text-xs text-zinc-400">
          Define the file paths where your Project Rules and Glossary are stored. 
          The AI will read these files to understand &quot;The Law&quot; of this codebase.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Rules File Path */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
              <FileText size={14} /> Coding Rules Path
            </label>
            <div className="flex items-center gap-2 bg-black/40 border border-zinc-700 rounded-lg px-3 py-2 focus-within:border-purple-500">
              <span className="text-zinc-600 font-mono text-xs">/</span>
              <input 
                value={rulesPath}
                onChange={(e) => setRulesPath(e.target.value)}
                className="bg-transparent w-full outline-none text-sm font-mono text-green-400"
              />
            </div>
          </div>

          {/* Glossary File Path */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
              <FileText size={14} /> Glossary Path
            </label>
            <div className="flex items-center gap-2 bg-black/40 border border-zinc-700 rounded-lg px-3 py-2 focus-within:border-purple-500">
              <span className="text-zinc-600 font-mono text-xs">/</span>
              <input 
                value={glossaryPath}
                onChange={(e) => setGlossaryPath(e.target.value)}
                className="bg-transparent w-full outline-none text-sm font-mono text-blue-400"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-md text-xs font-bold transition-colors">
            <Save size={14} /> Save Configuration
          </button>
        </div>
      </div>

      {/* Other Project Settings (Git, etc.) would go here... */}
    </div>
  );
};

