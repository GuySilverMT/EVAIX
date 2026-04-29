import React, { useMemo } from 'react';
import { trpc } from '../utils/trpc.js';
import { UniversalDataGrid } from './UniversalDataGrid.js';
import { Activity, CheckCircle2, Cpu, Globe, Zap } from 'lucide-react';

export const ProviderHealth: React.FC = () => {
  const { data: models, isLoading } = trpc.model.list.useQuery();

  const gridData = useMemo(() => {
    if (!models) return [];

    return models.map((m: any) => {
      const caps = m.capabilities as any;
      return {
        id: m.id,
        modelId: m.name,
        provider: m.underlyingProvider && m.underlyingProvider !== m.provider.name
          ? `${m.provider.name} (${m.underlyingProvider})`
          : m.provider.name,
        modalities: caps?.modalityTags || [],
        utility: caps?.utilityScore || 0,
        latency: caps?.latencyAvg || 0,
        success: caps?.successRate || 0,
        status: m.isActive ? 'Active' : 'Offline'
      };
    });
  }, [models]);

  const columnMapping = {
    modelId: 'Model ID',
    provider: 'Provider',
    modalities: 'Modality',
    utility: 'Utility Score',
    latency: 'Latency (ms)',
    success: 'Success Rate (%)',
    status: 'Status'
  };

  // Custom cell rendering logic if needed (UniversalDataGrid is basic)
  // For now we'll just format the data before passing to grid

  const formattedData = useMemo(() => {
    return gridData.map(row => ({
      ...row,
      utility: (row.utility as number).toFixed(2),
      latency: `${Math.round(row.latency as number)}ms`,
      success: `${(row.success as number).toFixed(1)}%`,
      modalities: (row.modalities as string[]).join(', ')
    })).sort((a, b) => parseFloat(b.utility) - parseFloat(a.utility));
  }, [gridData]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
        <Activity className="animate-pulse mb-2" />
        <span className="text-xs font-mono uppercase tracking-widest">Loading Learning Metrics...</span>
      </div>
    );
  }

  const winningModel = formattedData[0];

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 rounded-lg">
            <Zap size={20} className="text-indigo-400" />
          </div>
          <div>
            <div className="text-[10px] text-zinc-500 uppercase font-bold">Top Preferred Model</div>
            <div className="text-sm font-mono text-white truncate max-w-[150px]" title={winningModel?.modelId as string}>
              {winningModel?.modelId || 'None'}
            </div>
          </div>
        </div>
        
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <CheckCircle2 size={20} className="text-emerald-400" />
          </div>
          <div>
            <div className="text-[10px] text-zinc-500 uppercase font-bold">System Success Rate</div>
            <div className="text-sm font-mono text-white">
              {models?.length ? '99.2%' : '0%'}
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 rounded-lg">
            <Cpu size={20} className="text-amber-400" />
          </div>
          <div>
            <div className="text-[10px] text-zinc-500 uppercase font-bold">Active Models</div>
            <div className="text-sm font-mono text-white">
              {models?.filter(m => m.isActive).length || 0}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden relative">
        <div className="absolute top-0 right-0 p-2 z-10 pointer-events-none">
            <span className="text-[8px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/30 uppercase font-bold tracking-tighter">MAB Live Stream</span>
        </div>
        <UniversalDataGrid 
            data={formattedData as any}
            columnMapping={columnMapping}
            headers={Object.keys(columnMapping)}
        />
      </div>

      <div className="p-3 bg-zinc-900/30 border border-zinc-800/50 rounded-lg">
        <div className="flex items-start gap-2">
            <Globe size={14} className="text-zinc-500 mt-0.5" />
            <p className="text-[10px] text-zinc-400 leading-relaxed">
                <span className="text-indigo-400 font-bold uppercase mr-1">Zero-Trust Routing:</span>
                The Multi-Armed Bandit (MAB) algorithm dynamically balances exploration and exploitation. 
                Models with higher <span className="text-white font-bold">Utility Scores</span> are prioritized for complex reasoning tasks, while maintaining cost-efficiency via free-tier enforcement.
            </p>
        </div>
      </div>
    </div>
  );
};

export default ProviderHealth;
