import React, { useState } from 'react';
import { SuperAiButton } from '../../components/ui/SuperAiButton.js';
import { Input } from '../../components/ui/input.js';
import { Switch } from '../../components/ui/switch.js';
import { trpc } from '../../utils/trpc.js';
import { toast } from 'sonner';

interface AddProviderFormProps {
  onSuccessMorph?: (providerId: string, fetchedModels: any[]) => void;
  onCancel?: () => void;
}

const PROVIDER_TYPES = [
  { value: 'openai', label: 'OpenAI (Native)' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'google', label: 'Google AI Studio' },
  { value: 'mistral', label: 'Mistral' },
  { value: 'groq', label: 'Groq Cloud' },
  { value: 'xai', label: 'xAI (Grok)' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'cerebras', label: 'Cerebras' },
  { value: 'nvidia', label: 'NVIDIA NIM' },
  { value: 'ollama', label: 'Ollama (Local)' },
];

export const AddProviderForm: React.FC<AddProviderFormProps> = ({ onCancel, onSuccessMorph }) => {
  const [isActive, setIsActive] = useState(true);
  const [enforceFreeOnly, setEnforceFreeOnly] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('openai');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');

  const utils = trpc.useContext();

  const scoutMutation = trpc.providers.scout.useMutation();

  const upsertMutation = trpc.providers.upsert.useMutation({
    onSuccess: async (result) => {
      toast.success(`Provider ${result.name} added!`);
      utils.providers.list.invalidate();

      // Fetch models after adding
      try {
        await scoutMutation.mutateAsync({ providerId: result.id });
        toast.success(`Models fetched for ${result.name}!`);
      } catch (e: any) {
        toast.warning(`Provider added, but model fetch failed: ${e.message}`);
      }

      if (onSuccessMorph) onSuccessMorph(result.id, []);
      if (onCancel) onCancel();
    },
    onError: (e) => toast.error(`Failed: ${e.message}`)
  });

  const handleFetch = async () => {
    if (!name || (!apiKey && type !== 'ollama')) {
      toast.error("Please provide a name and API key");
      return;
    }

    upsertMutation.mutate({
      name,
      providerType: type,
      baseUrl: baseUrl || undefined,
      apiKey: apiKey || undefined,
      isEnabled: isActive,
      enforceFreeOnly,
      providerClass: 'FOUNDATIONAL'
    });
  };

  return (
    <div className={`flex flex-col w-full bg-slate-900 border border-slate-800 p-3 rounded-lg shadow-xl shadow-black/50 transition-opacity ${!isActive ? 'opacity-50 grayscale' : ''}`}>
      {/* Top Bar */}
      <div className="flex justify-between items-center h-8 mb-3 border-b border-slate-800 pb-2">
        <span className="text-xs font-bold text-blue-400 tracking-wider">NEW PROVIDER</span>
        <div className="flex items-center space-x-3">
          <span className="text-[10px] uppercase font-black text-slate-500 tracking-tighter">{isActive ? 'Live' : 'Offline'}</span>
          <Switch
            checked={isActive}
            onCheckedChange={setIsActive}
            className="scale-75 m-0 data-[state=checked]:bg-blue-500"
          />
        </div>
      </div>

      {/* Dense Inputs */}
      <div className="space-y-4 flex-grow">
        <div className="space-y-1">
          <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Identity</span>
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Name (e.g. My xAI)"
              value={name}
              onChange={e => setName(e.target.value)}
              className="h-8 text-[11px] bg-slate-950 border-slate-800 text-slate-200 focus:border-blue-500"
            />
            <select
              className="h-8 text-[11px] bg-slate-950 border border-slate-800 rounded px-2 text-slate-200"
              value={type}
              onChange={e => setType(e.target.value)}
            >
              {PROVIDER_TYPES.map(pt => <option key={pt.value} value={pt.value}>{pt.label}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Base URL (Optional)</span>
          <Input
            placeholder="https://..."
            value={baseUrl}
            onChange={e => setBaseUrl(e.target.value)}
            className="h-8 text-[11px] bg-slate-950 border-slate-800 text-slate-200 focus:border-blue-500"
          />
        </div>

        <div className="space-y-1">
          <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Credentials</span>
          <Input
            type="password"
            placeholder="API Key..."
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            className="h-8 text-[11px] font-mono bg-slate-950 border-slate-800 text-slate-200 focus:border-blue-500"
          />
        </div>

        <div className="pt-2 border-t border-slate-800/50">
          <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1 block">Guardrails</span>
          <label className="flex items-center justify-between p-2 bg-slate-950/50 rounded border border-slate-800/50 cursor-pointer hover:bg-slate-950 transition-colors">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-300">Free Models Only</span>
              <span className="text-[8px] text-slate-500">Only sync models with $0.00 cost</span>
            </div>
            <Switch
              checked={enforceFreeOnly}
              onCheckedChange={setEnforceFreeOnly}
              className="scale-75 data-[state=checked]:bg-emerald-500"
            />
          </label>
        </div>
      </div>

      {/* Action */}
      <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-800">
        <div className="text-[9px] font-mono text-slate-600">
          * Key will be synced to .env files
        </div>
        <div className="flex space-x-2">
          {onCancel && (
            <button
              onClick={onCancel}
              className="h-7 text-[10px] px-2 text-slate-400 hover:text-white uppercase font-black tracking-widest"
            >
              Cancel
            </button>
          )}
          <SuperAiButton
            label={upsertMutation.isLoading ? "Saving..." : "Add Provider"}
            intent="mutation"
            onClick={handleFetch}
            isLoading={upsertMutation.isLoading}
            className="h-7 text-[10px] px-3 bg-blue-600 hover:bg-blue-500 uppercase font-black tracking-widest"
          />
        </div>
      </div>
    </div>
  );
};
