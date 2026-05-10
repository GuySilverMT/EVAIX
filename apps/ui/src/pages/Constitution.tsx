import { useState } from 'react';
import { Scale, Book, Shield, Edit3, Settings } from 'lucide-react';
import { SuperAiButton } from '../components/ui/SuperAiButton.js';
import SmartEditor from '../components/SmartEditor.js';
import { WorkspaceSettings } from '../components/settings/WorkspaceSettings.js';

export default function Constitution({ embedded = false }: { embedded?: boolean }) {
  const [activeTab, setActiveTab] = useState<'rules' | 'glossary' | 'settings'>('rules');

  // Mock data - In real app, useCardVFS() to load from the paths set in WorkspaceSettings
  const [rulesContent, setRulesContent] = useState('# Project Coding Rules\n\n1. The Rule of Ubiquity...\n2. The Rule of Evolution...');
  const [glossaryContent, setGlossaryContent] = useState('# System Glossary\n\n* **SwappableCard**: A container for...');

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-white overflow-hidden">

      {/* Header */}
      {!embedded && (
        <div className="flex-none h-16 border-b border-zinc-800 bg-zinc-900/50 px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
              <Scale size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Project Constitution</h1>
              <p className="text-xs text-zinc-500">The governing laws and definitions of this project.</p>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex bg-black/40 p-1 rounded-lg border border-zinc-800">
            <button
              onClick={() => setActiveTab('rules')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'rules' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Shield size={14} /> Coding Rules
            </button>
            <button
              onClick={() => setActiveTab('glossary')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'glossary' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Book size={14} /> Glossary
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'settings' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Settings size={14} /> Sources
            </button>
          </div>

          <SuperAiButton contextId="constitution_editor" />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex gap-6 p-6 overflow-hidden">
        {/* Editor Container / Settings Container */}
        {activeTab === 'settings' ? (
          <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl overflow-y-auto shadow-2xl">
            <WorkspaceSettings />
          </div>
        ) : (
          <div className="flex-1 flex flex-col bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-black/20">
              <span className="text-xs font-mono text-zinc-500">
                {activeTab === 'rules' ? '.system/coding_rules.md' : '.system/glossary.md'}
              </span>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Edit3 size={12} /> Editable
              </div>
            </div>

            <div className="flex-1 relative">
              <SmartEditor
                fileName={activeTab === 'rules' ? 'coding_rules.md' : 'glossary.md'}
                content={activeTab === 'rules' ? rulesContent : glossaryContent}
                onChange={activeTab === 'rules' ? setRulesContent : setGlossaryContent}
              />
            </div>
          </div>
        )}

        {/* Context/Helper Column (Optional) */}
        <div className="w-80 hidden xl:flex flex-col gap-4">
          <div className="p-4 rounded-xl border border-blue-900/30 bg-blue-900/5">
            <h3 className="text-sm font-bold text-blue-400 mb-2">Why this matters</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              The AI reads these documents before starting any task. Keeping them updated ensures the &quot;Corporate Recruiter&quot; assigns the right roles and the &quot;Code Writer&quot; follows your style.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}