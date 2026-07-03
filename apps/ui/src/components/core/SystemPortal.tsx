import React, { useState } from 'react';
import { useProviderStore } from '../../stores/provider.store.js';

export interface SystemPortalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: 'provider' | 'model' | 'role' | 'system';
}

export const SystemPortal: React.FC<SystemPortalProps> = ({
  isOpen,
  onClose,
  initialType = 'provider'
}) => {
  const [activeTab, setActiveTab] = useState<'provider' | 'model' | 'role' | 'system'>(initialType);

  const providers = useProviderStore(s => s.providers);
  const activeProviderId = useProviderStore(s => s.activeProviderId);
  const activeModelId = useProviderStore(s => s.activeModelId);
  const roles = useProviderStore(s => s.roles);
  const activeRoleId = useProviderStore(s => s.activeRoleId);

  const addProvider = useProviderStore(s => s.addProvider);
  const setActiveProvider = useProviderStore(s => s.setActiveProvider);
  const setActiveModel = useProviderStore(s => s.setActiveModel);
  const setActiveRole = useProviderStore(s => s.setActiveRole);

  const [name, setName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [modelName, setModelName] = useState('');

  if (!isOpen) return null;

  const handleSubmitProvider = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const providerId = `provider-${Date.now()}`;
    addProvider({
      id: providerId,
      name: name.trim(),
      enabled: true,
      color,
      apiKey: apiKey.trim(),
      baseUrl: baseUrl.trim(),
      models: modelName.trim()
        ? [{ id: modelName.trim(), name: modelName.trim(), enabled: true }]
        : []
    });

    setName('');
    setApiKey('');
    setBaseUrl('');
    setModelName('');
  };

  const activeProvider = providers.find(p => p.id === activeProviderId) || providers[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm select-none">
      <div className="bg-[var(--colors-background)] border border-[var(--colors-divider)] rounded-lg w-[480px] shadow-2xl text-[var(--colors-primary)] font-[var(--typography-fontFamily)] overflow-hidden flex flex-col">
        {/* Header Tabs */}
        <div className="flex items-center justify-between bg-zinc-900 border-b border-[var(--colors-divider)] px-4 py-2.5">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('provider')}
              className={`px-3 py-1 text-xs font-bold rounded transition-colors ${
                activeTab === 'provider' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              [P] Providers
            </button>
            <button
              onClick={() => setActiveTab('model')}
              className={`px-3 py-1 text-xs font-bold rounded transition-colors ${
                activeTab === 'model' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              [M] Models
            </button>
            <button
              onClick={() => setActiveTab('role')}
              className={`px-3 py-1 text-xs font-bold rounded transition-colors ${
                activeTab === 'role' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              [R] Roles
            </button>
            <button
              onClick={() => setActiveTab('system')}
              className={`px-3 py-1 text-xs font-bold rounded transition-colors ${
                activeTab === 'system' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              [S] System
            </button>
          </div>

          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white font-bold text-sm"
          >
            ✕
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-5 max-h-[420px] overflow-y-auto">
          {activeTab === 'provider' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Manage AI Providers
              </h3>

              {providers.length > 0 && (
                <div className="space-y-2 border-b border-[var(--colors-divider)] pb-4">
                  <span className="text-[11px] font-semibold text-zinc-400 block">Active Providers</span>
                  <div className="grid grid-cols-2 gap-2">
                    {providers.map(p => (
                      <button
                        key={p.id}
                        onClick={() => setActiveProvider(p.id)}
                        className={`p-2 rounded border text-left text-xs flex items-center justify-between transition-colors ${
                          p.id === activeProviderId
                            ? 'border-blue-500 bg-blue-950/30 text-white'
                            : 'border-[var(--colors-divider)] bg-zinc-900/60 text-zinc-300 hover:border-zinc-500'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: p.color || '#3b82f6' }}
                          />
                          <span className="font-bold">{p.name}</span>
                        </div>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {p.models.length} M
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmitProvider} className="space-y-3 text-xs">
                <span className="text-[11px] font-semibold text-zinc-400 block">Add New Provider</span>
                <div>
                  <label className="block text-[11px] mb-1 text-zinc-400">Provider Name</label>
                  <input
                    type="text"
                    placeholder="e.g. OpenAI, Anthropic, Groq"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-[var(--colors-surface)] border border-[var(--colors-divider)] px-3 py-1.5 rounded text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] mb-1 text-zinc-400">API Key</label>
                  <input
                    type="password"
                    placeholder="sk-..."
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    className="w-full bg-[var(--colors-surface)] border border-[var(--colors-divider)] px-3 py-1.5 rounded text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] mb-1 text-zinc-400">Base URL (Optional)</label>
                  <input
                    type="text"
                    placeholder="https://api.openai.com/v1"
                    value={baseUrl}
                    onChange={e => setBaseUrl(e.target.value)}
                    className="w-full bg-[var(--colors-surface)] border border-[var(--colors-divider)] px-3 py-1.5 rounded text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] mb-1 text-zinc-400">Default Model Name</label>
                  <input
                    type="text"
                    placeholder="e.g. gpt-4o"
                    value={modelName}
                    onChange={e => setModelName(e.target.value)}
                    className="w-full bg-[var(--colors-surface)] border border-[var(--colors-divider)] px-3 py-1.5 rounded text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] text-zinc-400">Badge Color:</label>
                    <input
                      type="color"
                      value={color}
                      onChange={e => setColor(e.target.value)}
                      className="w-6 h-6 rounded border-0 cursor-pointer bg-transparent"
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-3 py-1.5 text-xs rounded bg-blue-600 hover:bg-blue-500 text-white font-bold"
                  >
                    Save Provider
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'model' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Model Inventory
              </h3>

              {!activeProvider ? (
                <div className="p-4 text-center text-xs text-zinc-500">
                  No providers configured. Please add a provider first.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs text-zinc-300 flex items-center gap-2">
                    <span>Provider:</span>
                    <span className="font-bold text-blue-400">{activeProvider.name}</span>
                  </div>

                  <div className="space-y-1.5">
                    {activeProvider.models.length === 0 ? (
                      <div className="text-xs text-zinc-500 italic">No models registered under this provider.</div>
                    ) : (
                      activeProvider.models.map(m => (
                        <button
                          key={m.id}
                          onClick={() => setActiveModel(m.id)}
                          className={`w-full p-2.5 rounded border text-left text-xs flex items-center justify-between transition-colors ${
                            m.id === activeModelId
                              ? 'border-green-500 bg-green-950/30 text-white font-bold'
                              : 'border-[var(--colors-divider)] bg-zinc-900/60 text-zinc-300 hover:border-zinc-500'
                          }`}
                        >
                          <span className="font-mono">{m.name}</span>
                          {m.id === activeModelId && (
                            <span className="text-[10px] text-green-400 uppercase tracking-wider font-bold">Active</span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'role' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Agent Roles & Persona
              </h3>

              <div className="space-y-2">
                {roles.map(role => (
                  <button
                    key={role.id}
                    onClick={() => setActiveRole(role.id)}
                    className={`w-full p-2.5 rounded border text-left text-xs flex items-center justify-between transition-colors ${
                      role.id === activeRoleId
                        ? 'border-purple-500 bg-purple-950/30 text-white font-bold'
                        : 'border-[var(--colors-divider)] bg-zinc-900/60 text-zinc-300 hover:border-zinc-500'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: role.color || '#a855f7' }}
                      />
                      <span>{role.name}</span>
                    </div>
                    {role.id === activeRoleId && (
                      <span className="text-[10px] text-purple-400 uppercase font-bold">Active Role</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="space-y-4 text-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                EVAIX System Configuration
              </h3>

              <div className="p-3 bg-zinc-900/80 rounded border border-[var(--colors-divider)] space-y-2">
                <div className="flex justify-between items-center text-zinc-300">
                  <span>Zero-Trust Control Plane</span>
                  <span className="text-green-400 font-mono font-bold">ACTIVE</span>
                </div>
                <div className="flex justify-between items-center text-zinc-300">
                  <span>LiteLLM Proxy Router</span>
                  <span className="text-blue-400 font-mono font-bold">DISCOVERABLE</span>
                </div>
                <div className="flex justify-between items-center text-zinc-300">
                  <span>Spatial Matrix Windowing</span>
                  <span className="text-purple-400 font-mono font-bold">HYBRID</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[var(--colors-divider)] bg-zinc-900/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold"
          >
            Close Portal
          </button>
        </div>
      </div>
    </div>
  );
};
