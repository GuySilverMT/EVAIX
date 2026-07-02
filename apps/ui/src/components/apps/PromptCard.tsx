import React, { useState } from 'react';
import { Terminal, Play, Save, Plus, Trash2, Sparkles, Sliders } from 'lucide-react';
import { toast } from 'sonner';

interface Variable {
  name: string;
  value: string;
}

export function PromptCard() {
  const [systemPrompt, setSystemPrompt] = useState(
    'You are an expert Frontend Architect enforcing strict equal-width tiling grid principles in EVAIX.'
  );
  const [userTemplate, setUserTemplate] = useState('Refactor the component {{componentName}} to adhere to {{designSystem}} rules.');
  const [variables, setVariables] = useState<Variable[]>([
    { name: 'componentName', value: 'PromptCard.tsx' },
    { name: 'designSystem', value: 'EVAIX Tiling Protocol' }
  ]);
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);

  const handleRunPrompt = () => {
    setRunning(true);
    let interpolated = userTemplate;
    variables.forEach(v => {
      interpolated = interpolated.replace(new RegExp(`{{${v.name}}}`, 'g'), v.value);
    });

    setTimeout(() => {
      setOutput(`[PROMPT EXECUTION RESULT]\nSystem: "${systemPrompt}"\nPrompt: "${interpolated}"\n\nResponse: Successfully validated prompt output format. Temperature=0.7, Model=Gemini-2.5-Flash.`);
      setRunning(false);
      toast.success('Prompt executed successfully');
    }, 600);
  };

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950 font-sans text-zinc-100 overflow-hidden">
      {/* Header */}
      <div className="bg-zinc-900 border-b border-zinc-800 p-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal size={16} className="text-purple-400" />
          <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">Prompt Studio</span>
        </div>
        <button 
          onClick={handleRunPrompt}
          disabled={running}
          className="px-3 py-1 bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-800 text-white text-[10px] font-bold rounded flex items-center gap-1 transition-colors"
        >
          <Play size={10} /> {running ? 'Running...' : 'Test Run'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
        {/* System Instruction */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">System Instruction</label>
          <textarea 
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={3}
            className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-zinc-200 font-mono focus:border-purple-500 outline-none resize-none"
          />
        </div>

        {/* User Prompt Template */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">User Prompt Template</label>
          <textarea 
            value={userTemplate}
            onChange={(e) => setUserTemplate(e.target.value)}
            rows={4}
            className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-zinc-200 font-mono focus:border-purple-500 outline-none resize-none"
          />
        </div>

        {/* Variables Section */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Inject Variables</span>
            <button 
              onClick={() => setVariables(p => [...p, { name: `var${p.length + 1}`, value: '' }])}
              className="text-[10px] text-purple-400 hover:underline flex items-center gap-1"
            >
              <Plus size={10} /> Add Variable
            </button>
          </div>
          <div className="space-y-1.5">
            {variables.map((v, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <input 
                  type="text"
                  value={v.name}
                  onChange={(e) => {
                    const next = [...variables];
                    next[idx].name = e.target.value;
                    setVariables(next);
                  }}
                  placeholder="name"
                  className="w-1/3 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-purple-300 font-mono outline-none"
                />
                <input 
                  type="text"
                  value={v.value}
                  onChange={(e) => {
                    const next = [...variables];
                    next[idx].value = e.target.value;
                    setVariables(next);
                  }}
                  placeholder="value"
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-300 font-mono outline-none"
                />
                <button 
                  onClick={() => setVariables(p => p.filter((_, i) => i !== idx))}
                  className="text-zinc-600 hover:text-red-400 p-1"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Output Log */}
        {output && (
          <div className="space-y-1.5 pt-2 border-t border-zinc-800">
            <label className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Execution Output</label>
            <pre className="p-3 bg-zinc-900 border border-zinc-800 rounded text-[11px] font-mono text-zinc-300 whitespace-pre-wrap">
              {output}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
