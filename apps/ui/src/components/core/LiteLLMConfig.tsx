import React, { useState } from 'react';
import { useProviderStore } from '../../stores/provider.store.js';

export interface LiteLLMConfigProps {
  id?: string;
  cardId?: string;
}

export const LiteLLMConfig: React.FC<LiteLLMConfigProps> = () => {
  const addProvider = useProviderStore(s => s.addProvider);

  const [providerName, setProviderName] = useState('LiteLLM Proxy');
  const [apiKey, setApiKey] = useState('sk-litellm-key');
  const [baseUrl, setBaseUrl] = useState('http://localhost:4000');
  const [modelName, setModelName] = useState('gpt-4o');
  const [color, setColor] = useState('#10b981');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!providerName.trim()) return;

    const providerId = `litellm-${Date.now()}`;
    addProvider({
      id: providerId,
      name: providerName.trim(),
      enabled: true,
      color,
      apiKey: apiKey.trim(),
      baseUrl: baseUrl.trim(),
      models: modelName.trim()
        ? [
            { id: modelName.trim(), name: modelName.trim(), enabled: true },
            { id: 'claude-3-5-sonnet', name: 'claude-3-5-sonnet', enabled: true },
            { id: 'llama-3', name: 'llama-3', enabled: true }
          ]
        : []
    });

    setSaved(true);
  };

  return (
    <div className="h-full w-full p-6 bg-[var(--colors-background)] text-[var(--colors-primary)] font-[var(--typography-fontFamily)] flex flex-col justify-between overflow-y-auto">
      <div className="space-y-4">
        <div className="flex items-center gap-3 border-b border-[var(--colors-divider)] pb-3">
          <span className="material-icons text-green-400 text-2xl animate-pulse">hub</span>
          <div>
            <h2 className="text-base font-bold uppercase tracking-wider">LiteLLM Proxy Integration</h2>
            <p className="text-xs text-zinc-400">Connect your local LiteLLM model router to EVAIX</p>
          </div>
        </div>

        {saved ? (
          <div className="p-4 bg-green-950/40 border border-green-500/50 rounded-lg text-green-300 text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-icons text-sm">check_circle</span>
              <span>Provider added to global store! AvexBar HUD updated.</span>
            </div>
            <button
              onClick={() => setSaved(false)}
              className="text-xs underline hover:text-white"
            >
              Add Another
            </button>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold mb-1 text-zinc-300">Provider Name</label>
              <input
                type="text"
                value={providerName}
                onChange={e => setProviderName(e.target.value)}
                className="w-full bg-[var(--colors-surface)] border border-[var(--colors-divider)] px-3 py-2 rounded text-white focus:outline-none focus:border-green-500"
                required
              />
            </div>

            <div>
              <label className="block font-semibold mb-1 text-zinc-300">LiteLLM Master Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                className="w-full bg-[var(--colors-surface)] border border-[var(--colors-divider)] px-3 py-2 rounded text-white focus:outline-none focus:border-green-500"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1 text-zinc-300">LiteLLM Proxy URL</label>
              <input
                type="text"
                value={baseUrl}
                onChange={e => setBaseUrl(e.target.value)}
                className="w-full bg-[var(--colors-surface)] border border-[var(--colors-divider)] px-3 py-2 rounded text-white focus:outline-none focus:border-green-500"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1 text-zinc-300">Primary Default Model</label>
              <input
                type="text"
                value={modelName}
                onChange={e => setModelName(e.target.value)}
                className="w-full bg-[var(--colors-surface)] border border-[var(--colors-divider)] px-3 py-2 rounded text-white focus:outline-none focus:border-green-500"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1 text-zinc-300">Badge Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={e => setColor(e.target.value)}
                  className="w-8 h-8 rounded border-0 cursor-pointer bg-transparent"
                />
                <span className="font-mono text-zinc-400">{color}</span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded uppercase tracking-wider text-xs transition-colors shadow-md mt-2 cursor-pointer"
            >
              Save & Link LiteLLM
            </button>
          </form>
        )}
      </div>

      <div className="pt-4 border-t border-[var(--colors-divider)] text-[10px] text-zinc-500 font-mono flex items-center justify-between">
        <span>STATUS: READY</span>
        <span>LITELLM_V1.2</span>
      </div>
    </div>
  );
};
