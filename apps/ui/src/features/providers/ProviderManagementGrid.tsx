import React, { useState, useEffect, useMemo } from 'react';
import { trpc } from '../../utils/trpc.js';
import {
  Plus,
  Trash2,
  Save,
  Zap,
  Loader2,
  Database,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';
import { Badge } from '../../components/ui/badge.js';
import { Button } from '../../components/ui/button.js';
import { Input } from '../../components/ui/input.js';
import { Switch } from '../../components/ui/switch.js';
import { cn } from '../../lib/utils.js';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { AddProviderForm } from './AddProviderForm.js';
import { ModelInventoryModal } from './ModelInventoryModal.js';
import { ProviderModelModal } from './ProviderModelModal.js';
import { RefreshCw as RefreshIcon } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface Provider {
  id: string;
  name: string;
  type: string;
  baseUrl: string | null;
  apiKey: string | null;
  apiKeyEnvVar: string | null;
  serviceCategories: string[];
  billingRiskLevel: 'ZERO_RISK' | 'PROMO_BURN' | 'CC_ON_FILE';
  promoMonthlyLimit: number | null;
  monthlyBudget: number | null;
  enforceFreeOnly: boolean;
  isCreditCardLinked: boolean;
  providerClass: 'FOUNDATIONAL' | 'AGGREGATOR' | 'INFERENCE_ENGINE' | 'LOCAL';
  isEnabled: boolean;
  status: string;
  lastError: string | null;
}

const RISK_COLORS = {
  ZERO_RISK: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  PROMO_BURN: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  CC_ON_FILE: 'bg-red-500/10 text-red-400 border-red-500/30',
};

const CLASS_LABELS: Record<string, string> = {
  FOUNDATIONAL: 'Foundational',
  AGGREGATOR: 'Aggregator / Proxy',
  INFERENCE_ENGINE: 'Inference Engine',
  LOCAL: 'Local',
};

// ─────────────────────────────────────────────────────────────────────────────
// ProviderCard — inline-editable, all real data
// ─────────────────────────────────────────────────────────────────────────────
function ProviderCard({ provider, onSaved, onDeleted, onViewInventory, onViewOverrides }: {
  provider: Provider;
  onSaved: () => void;
  onDeleted: () => void;
  onViewInventory: (id: string, name: string) => void;
  onViewOverrides: (id: string, name: string) => void;
}) {
  const utils = trpc.useContext();
  const [expanded, setExpanded] = useState(false);

  const [draft, setDraft] = useState<Provider>({ ...provider });
  const [dirty, setDirty] = useState(false);

  // Real model counts — reads from Model table (populated by fetchAndNormalizeModels)
  const { data: modelData, isLoading: modelsLoading, refetch: refetchModels } = trpc.model.listByProvider.useQuery(
    { providerId: provider.id },
    { staleTime: 30_000 }
  );

  // Real spend — sums ModelUsage.cost for this provider
  const { data: spendData } = trpc.model.getProviderSpend.useQuery(
    { providerId: provider.id },
    { staleTime: 30_000 }
  );

  const counts = modelData?.counts ?? { llm: 0, embedding: 0, image: 0, audio: 0, vision: 0, other: 0, total: 0 };
  const spend = spendData?.totalCost ?? 0;
  const budget = draft.monthlyBudget ?? 0;
  const budgetPct = budget > 0 ? Math.min(100, (spend / budget) * 100) : 0;
  const overBudget = budget > 0 && spend >= budget;

  // Mutations
  const upsertMutation = trpc.providers.upsert.useMutation({
    onSuccess: () => { toast.success('Provider saved'); setDirty(false); onSaved(); },
    onError: (e) => toast.error(e.message),
  });

  const setEnabledMutation = trpc.providers.setEnabled.useMutation({
    onSuccess: (updated) => {
      toast.success(`Provider ${updated.isEnabled ? 'enabled' : 'disabled'}`);
      setDraft(d => ({ ...d, isEnabled: updated.isEnabled }));
      onSaved();
    },
    onError: (e) => toast.error(e.message),
  });

  const fetchModelsMutation = trpc.providers.fetchAndNormalizeModels.useMutation({
    onSuccess: (res) => {
      toast.success(`Synced ${res.count} models for ${provider.name}`);
      // Force immediate re-fetch of relevant data
      utils.model.listByProvider.invalidate({ providerId: provider.id });
      utils.providers.list.invalidate();
      refetchModels();
    },
    onError: (e) => toast.error(`Fetch failed: ${e.message}`),
  });


  const deleteMutation = trpc.providers.delete.useMutation({
    onSuccess: () => { toast.success('Deleted'); onDeleted(); },
    onError: (e) => toast.error(e.message),
  });

  const update = (patch: Partial<Provider>) => {
    setDraft(d => ({ ...d, ...patch }));
    setDirty(true);
  };

  const save = () => {
    upsertMutation.mutate({
      id: draft.id,
      name: draft.name,
      providerType: draft.type,
      baseUrl: draft.baseUrl || undefined,
      apiKey: (draft.apiKey && draft.apiKey !== '••••••••') ? draft.apiKey : undefined,
      apiKeyEnvVar: draft.apiKeyEnvVar || undefined,
      serviceCategories: draft.serviceCategories,
      billingRiskLevel: draft.billingRiskLevel,
      promoMonthlyLimit: draft.promoMonthlyLimit || undefined,
      monthlyBudget: draft.monthlyBudget || undefined,
      enforceFreeOnly: draft.enforceFreeOnly,
      isCreditCardLinked: draft.isCreditCardLinked,
      providerClass: draft.providerClass,
      isEnabled: draft.isEnabled,
    });
  };

  const isEnabled = draft.isEnabled;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className={cn(
        'bg-slate-900 border rounded-lg overflow-hidden transition-all',
        isEnabled ? 'border-slate-800' : 'border-slate-800/50 opacity-60 grayscale',
      )}
    >
      {/* ── Header Row ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-800 bg-slate-900/80">
        {/* Enable/Disable toggle — wired to providers.setEnabled */}
        <Switch
          checked={isEnabled}
          onCheckedChange={(val) => setEnabledMutation.mutate({ id: provider.id, isEnabled: val })}
          className="scale-75 data-[state=checked]:bg-blue-500 shrink-0"
        />
        <span className={cn('text-[10px] font-black uppercase tracking-widest shrink-0', isEnabled ? 'text-blue-400' : 'text-slate-600')}>
          {isEnabled ? 'Live' : 'Off'}
        </span>

        <div className="flex-1 min-w-0">
          <Input
            value={draft.name}
            onChange={e => update({ name: e.target.value })}
            className="h-6 text-[11px] font-bold bg-transparent border-transparent hover:border-slate-700 focus:border-blue-500 text-slate-100 p-0 px-1"
          />
        </div>

        <Badge className={cn('text-[8px] font-black border px-1 h-4 uppercase shrink-0', RISK_COLORS[draft.billingRiskLevel])}>
          {draft.billingRiskLevel.replace('_', ' ')}
        </Badge>

        {/* Model count pill — real data & opens inventory */}
        <button
          onClick={(e) => { e.stopPropagation(); onViewInventory(provider.id, provider.name); }}
          className="flex items-center gap-1 text-[9px] font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-slate-500 shrink-0 hover:border-blue-500/50 hover:text-blue-400 transition-all cursor-pointer group"
        >
          {modelsLoading
            ? <Loader2 size={8} className="animate-spin" />
            : counts.total > 0
              ? <>
                <span className="text-blue-400 group-hover:scale-110 transition-transform">{counts.total}</span>
                <span className="opacity-40">mdl</span>
              </>
              : <span className="text-slate-700">no models</span>
          }
        </button>
        {/* Real spend vs budget */}
        {budget > 0 && (
          <div className={cn(
            'text-[9px] font-mono px-2 py-0.5 rounded border shrink-0',
            overBudget ? 'text-red-400 border-red-500/30 bg-red-500/10' : 'text-slate-500 border-slate-800 bg-slate-950'
          )}>
            {overBudget && <AlertTriangle size={8} className="inline mr-0.5" />}
            ${spend.toFixed(2)} / ${budget}
          </div>
        )}

        <button
          onClick={() => setExpanded(e => !e)}
          className="text-slate-500 hover:text-slate-200 transition-colors shrink-0"
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* ── Expanded Inline Edit Form ────────────────────────────── */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="p-3 space-y-3">

              {/* Row 1: Provider type + Class */}
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Type</span>
                  <Input
                    value={draft.type}
                    onChange={e => update({ type: e.target.value })}
                    placeholder="openai / groq / anthropic…"
                    className="h-7 text-[11px] bg-slate-950 border-slate-800 text-slate-200 focus:border-blue-500"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Class</span>
                  <select
                    value={draft.providerClass}
                    onChange={e => update({ providerClass: e.target.value as any })}
                    className="w-full h-7 text-[11px] bg-slate-950 border border-slate-800 rounded text-slate-200 focus:border-blue-500 px-2"
                  >
                    {Object.entries(CLASS_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Row 2: Base URL */}
              <label className="block space-y-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Base URL</span>
                <Input
                  value={draft.baseUrl ?? ''}
                  onChange={e => update({ baseUrl: e.target.value })}
                  placeholder="https://api.openai.com/v1"
                  className="h-7 text-[11px] bg-slate-950 border-slate-800 text-slate-200 focus:border-blue-500"
                />
              </label>

              {/* Row 3: API Key */}
              <label className="block space-y-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">API Key (leave blank to keep existing)</span>
                <Input
                  type="password"
                  placeholder="sk-…  (stored encrypted)"
                  onChange={e => update({ apiKey: e.target.value })}
                  className="h-7 text-[11px] font-mono bg-slate-950 border-slate-800 text-slate-200 focus:border-blue-500"
                />
              </label>

              {/* Row 4: ENV var fallback */}
              <label className="block space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">ENV Var Override</span>
                  <span className="text-[8px] text-slate-600 font-medium">Variable Name (e.g. XAI_API_KEY)</span>
                </div>
                <Input
                  value={draft.apiKeyEnvVar ?? ''}
                  onChange={e => update({ apiKeyEnvVar: e.target.value })}
                  placeholder="OPENAI_API_KEY"
                  className="h-7 text-[11px] font-mono bg-slate-950 border-slate-800 text-slate-200 focus:border-blue-500"
                />
              </label>


              {/* Row 5: Service categories */}
              <label className="block space-y-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Service Categories (comma-separated)</span>
                <Input
                  value={draft.serviceCategories.join(', ')}
                  onChange={e => update({ serviceCategories: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  placeholder="LLM, VISION, EMBEDDING, TTS"
                  className="h-7 text-[11px] bg-slate-950 border-slate-800 text-slate-200 focus:border-blue-500"
                />
              </label>

              {/* Row 6: Financial guardrails */}
              <div className="grid grid-cols-3 gap-2">
                <label className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Risk</span>
                  <select
                    value={draft.billingRiskLevel}
                    onChange={e => update({ billingRiskLevel: e.target.value as any })}
                    className="w-full h-7 text-[11px] bg-slate-950 border border-slate-800 rounded text-slate-200 focus:border-blue-500 px-2"
                  >
                    <option value="ZERO_RISK">Zero Risk</option>
                    <option value="PROMO_BURN">Promo Burn</option>
                    <option value="CC_ON_FILE">CC On File</option>
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Promo Limit ($)</span>
                  <Input
                    type="number"
                    value={draft.promoMonthlyLimit ?? 0}
                    onChange={e => update({ promoMonthlyLimit: parseFloat(e.target.value) })}
                    className="h-7 text-[11px] font-mono bg-slate-950 border-slate-800 text-slate-200 focus:border-blue-500"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Hard Budget ($)</span>
                  <Input
                    type="number"
                    value={draft.monthlyBudget ?? 0}
                    onChange={e => update({ monthlyBudget: parseFloat(e.target.value) })}
                    className="h-7 text-[11px] font-mono bg-slate-950 border-slate-800 text-slate-200 focus:border-blue-500"
                  />
                </label>
              </div>

              {/* Row 7: Guardrail toggles */}
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch
                    checked={draft.enforceFreeOnly}
                    onCheckedChange={v => update({ enforceFreeOnly: v })}
                    className="scale-75 data-[state=checked]:bg-emerald-500"
                  />
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Free-Only</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch
                    checked={draft.isCreditCardLinked}
                    onCheckedChange={v => update({ isCreditCardLinked: v })}
                    className="scale-75 data-[state=checked]:bg-red-500"
                  />
                  <span className="text-[10px] text-slate-400 font-bold uppercase">CC Linked</span>
                </label>
              </div>

              {/* Real model breakdown from Model table */}
              <div className="p-2 bg-slate-950 rounded border border-slate-800 text-[9px] font-mono space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-black uppercase tracking-widest text-slate-600">Synced Models</span>
                  {modelsLoading && <Loader2 size={9} className="animate-spin text-slate-600" />}
                </div>
                {counts.total > 0 ? (
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {counts.llm > 0 && <span className="text-blue-400">LLM: {counts.llm}</span>}
                    {counts.embedding > 0 && <span className="text-purple-400">EMBED: {counts.embedding}</span>}
                    {counts.image > 0 && <span className="text-pink-400">IMG: {counts.image}</span>}
                    {counts.audio > 0 && <span className="text-amber-400">AUDIO: {counts.audio}</span>}
                    {counts.vision > 0 && <span className="text-emerald-400">VISION: {counts.vision}</span>}
                    {counts.other > 0 && <span className="text-slate-500">OTHER: {counts.other}</span>}
                  </div>
                ) : (
                  <div className="text-slate-700">
                    {modelsLoading ? 'Loading…' : 'No models — click Fetch Models below'}
                  </div>
                )}

                {/* Real spend from ModelUsage */}
                <div className="flex justify-between items-center pt-1 border-t border-slate-800">
                  <span className="flex items-center gap-1 text-slate-600">
                    <DollarSign size={9} /> Actual Spend (DB)
                  </span>
                  <span className={cn('font-black', overBudget ? 'text-red-400' : spend > 0 ? 'text-emerald-400' : 'text-slate-700')}>
                    ${spend.toFixed(4)}
                  </span>
                </div>

                {/* Budget utilisation bar — only if budget is set */}
                {budget > 0 && (
                  <div>
                    <div className="flex justify-between text-[8px] text-slate-600 mb-0.5">
                      <span>Budget</span>
                      <span className={overBudget ? 'text-red-400 font-black' : ''}>{budgetPct.toFixed(0)}% of ${budget}</span>
                    </div>
                    <div className="w-full h-1 bg-slate-800 rounded overflow-hidden">
                      <div
                        className={cn('h-full transition-all', overBudget ? 'bg-red-500' : budgetPct > 80 ? 'bg-amber-500' : 'bg-blue-500')}
                        style={{ width: `${budgetPct}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Request count */}
                {(spendData?.totalRequests ?? 0) > 0 && (
                  <div className="text-slate-700">
                    {spendData!.totalRequests} requests · {((spendData!.totalPromptTokens + spendData!.totalCompletionTokens) / 1000).toFixed(1)}k tokens
                  </div>
                )}

                {provider.lastError && (
                  <div className="text-red-400 truncate flex items-center gap-1" title={provider.lastError}>
                    <AlertTriangle size={9} /> {provider.lastError}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center pt-1 border-t border-slate-800">
                <div className="flex gap-2">
                  {/* Fetch & sync models from provider API */}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={fetchModelsMutation.isLoading}
                    onClick={() => fetchModelsMutation.mutate({ providerId: provider.id })}
                    className="h-6 text-[9px] font-black uppercase tracking-widest bg-slate-950 border-slate-800 text-slate-400 hover:text-blue-400 hover:border-blue-500/50 gap-1"
                  >
                    {fetchModelsMutation.isLoading
                      ? <Loader2 size={10} className="animate-spin" />
                      : <RefreshCw size={10} />
                    }
                    Fetch Models
                  </Button>

                  {/* Delete */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { if (confirm(`Delete "${provider.name}"?`)) deleteMutation.mutate({ id: provider.id }); }}
                    className="h-6 text-[9px] font-black uppercase tracking-widest text-red-500/60 hover:text-red-400 hover:bg-red-500/10 gap-1"
                  >
                    <Trash2 size={10} /> Delete
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewInventory(provider.id, provider.name)}
                    className="h-6 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-white gap-1"
                  >
                    <Database size={10} /> Inventory
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewOverrides(provider.id, provider.name)}
                    className="h-6 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-white gap-1"
                  >
                    <Zap size={10} /> Overrides
                  </Button>
                </div>

                {/* Save changes */}
                {dirty && (
                  <Button
                    size="sm"
                    onClick={save}
                    disabled={upsertMutation.isLoading}
                    className="h-6 text-[9px] font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-500 text-white gap-1"
                  >
                    {upsertMutation.isLoading ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />}
                    Save
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Grid
// ─────────────────────────────────────────────────────────────────────────────
export const ProviderManagementGrid: React.FC<{ workflowMode?: boolean }> = () => {
  const utils = trpc.useContext();
  const { data: remoteProviders, isLoading } = trpc.providers.list.useQuery();
  const [localProviders, setLocalProviders] = useState<Provider[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [activeTab, setActiveTab] = useState('ALL');
  const [inventoryModalProvider, setInventoryModalProvider] = useState<{ id: string; name: string } | null>(null);
  const [providerModelModalProvider, setProviderModelModalProvider] = useState<{ id: string; name: string } | null>(null);

  const globalSyncMutation = trpc.model.sync.useMutation({
    onSuccess: () => {
      toast.success('Global model sync started');
      invalidate();
    },
    onError: (e) => toast.error(`Sync failed: ${e.message}`),
  });

  useEffect(() => {
    if (remoteProviders) setLocalProviders(remoteProviders as Provider[]);
  }, [remoteProviders]);

  const categories = useMemo(() =>
    ['ALL', ...Array.from(new Set(localProviders.flatMap(p => p.serviceCategories)))],
    [localProviders]
  );

  const filtered = useMemo(() =>
    localProviders.filter(p =>
      activeTab === 'ALL' || p.serviceCategories.includes(activeTab)
    ),
    [localProviders, activeTab]
  );

  const byClass = useMemo(() => {
    const g: Record<string, Provider[]> = { FOUNDATIONAL: [], AGGREGATOR: [], INFERENCE_ENGINE: [], LOCAL: [] };
    filtered.forEach(p => { (g[p.providerClass] ??= []).push(p); });
    return g;
  }, [filtered]);

  const invalidate = () => utils.providers.list.invalidate();

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-3">
      <Loader2 className="animate-spin text-blue-500" size={28} />
      <span className="text-[10px] uppercase font-black tracking-widest">Loading Providers…</span>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-slate-950 overflow-hidden">

      {/* Header */}
      <div className="flex-none flex justify-between items-center px-4 py-3 border-b border-slate-800">
        <div>
          <h1 className="text-base font-black text-white tracking-tighter flex items-center gap-2">
            <Zap className="text-blue-400" size={16} /> PROVIDER & CAPABILITY ARBITRAGE
          </h1>
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-0.5">
            {localProviders.filter(p => p.isEnabled).length} active · {localProviders.length} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Global Refresh */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => globalSyncMutation.mutate()}
            disabled={globalSyncMutation.isLoading}
            className="h-7 text-[9px] uppercase font-black tracking-widest bg-slate-900 border-slate-800 text-slate-500 hover:text-white"
          >
            {globalSyncMutation.isLoading ? <Loader2 size={12} className="animate-spin mr-1.5" /> : <RefreshIcon size={12} className="mr-1.5" />}
            Global Sync
          </Button>

          <Button
            onClick={() => setIsAdding(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white font-black text-[10px] h-7 px-3 gap-1 uppercase tracking-widest"
          >
            <Plus size={12} /> Add Provider
          </Button>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex-none flex gap-1 px-4 pt-2 border-b border-slate-800 overflow-x-auto">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveTab(cat)}
            className={cn(
              'px-3 py-1 text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-colors border-b-2',
              activeTab === cat
                ? 'text-blue-400 border-blue-500'
                : 'text-slate-600 border-transparent hover:text-slate-300',
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Provider cards */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {(Object.entries(byClass) as [string, Provider[]][]).map(([cls, providers]) => {
          if (!providers.length) return null;
          return (
            <div key={cls}>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 whitespace-nowrap">
                  {CLASS_LABELS[cls]}
                </span>
                <div className="h-px flex-1 bg-slate-800" />
                <span className="text-[9px] text-slate-700 font-mono">{providers.length}</span>
              </div>

              <AnimatePresence>
                <div className="space-y-2">
                  {providers.map(p => (
                    <ProviderCard
                      key={p.id}
                      provider={p}
                      onSaved={invalidate}
                      onDeleted={invalidate}
                      onViewInventory={(id, name) => setInventoryModalProvider({ id, name })}
                      onViewOverrides={(id, name) => setProviderModelModalProvider({ id, name })}
                    />
                  ))}
                </div>
              </AnimatePresence>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-600">
            <Database size={28} className="mb-3 text-slate-800" />
            <div className="text-[11px] font-black uppercase tracking-widest mb-1">No Providers</div>
            <p className="text-[10px] text-slate-600">Add a provider to get started.</p>
          </div>
        )}
      </div>

      {/* Add Provider Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-sm"
            >
              <AddProviderForm
                onCancel={() => setIsAdding(false)}
                onSuccessMorph={() => { setIsAdding(false); invalidate(); }}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Model Inventory Drawer */}
      <AnimatePresence>
        {inventoryModalProvider && (
          <ModelInventoryModal
            providerId={inventoryModalProvider.id}
            providerName={inventoryModalProvider.name}
            onClose={() => setInventoryModalProvider(null)}
          />
        )}
      </AnimatePresence>

      {/* ProviderModel Modal */}
      <AnimatePresence>
        {providerModelModalProvider && (
          <ProviderModelModal
            providerId={providerModelModalProvider.id}
            providerName={providerModelModalProvider.name}
            onClose={() => setProviderModelModalProvider(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
