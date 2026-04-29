import React, { useState } from 'react';
import { ProviderManagementGrid } from '../features/providers/ProviderManagementGrid.js';
import { ProviderHealth } from '../components/ProviderHealth.js';
import { ShieldCheck, ArrowLeft, Database, Activity, LayoutGrid, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button.js';
import { cn } from '../lib/utils.js';

export const ControlPlane: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'registry' | 'analytics'>('registry');

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-white overflow-hidden font-sans">
      {/* Header */}
      <header className="h-16 border-b border-zinc-800/50 flex items-center justify-between px-6 bg-zinc-900/40 backdrop-blur-xl z-30">
        <div className="flex items-center gap-6">
          <Link to="/workbench">
            <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-white hover:bg-zinc-800/50 transition-all">
              <ArrowLeft size={20} />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20 shadow-[0_0_20px_rgba(79,70,229,0.15)]">
                <ShieldCheck size={20} className="text-indigo-400" />
            </div>
            <div>
              <h1 className="text-sm font-black uppercase tracking-[0.2em] text-white">Zero-Trust Control Plane</h1>
              <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">Routing & Provider Orchestration</div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex bg-zinc-900/80 p-1 rounded-xl border border-zinc-800/50">
            <button 
              onClick={() => setActiveTab('registry')}
              className={cn(
                "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                activeTab === 'registry' ? "bg-indigo-600 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <LayoutGrid size={12} /> Registry
            </button>
            <button 
              onClick={() => setActiveTab('analytics')}
              className={cn(
                "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                activeTab === 'analytics' ? "bg-indigo-600 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <BarChart3 size={12} /> Analytics
            </button>
          </div>

          <div className="h-6 w-px bg-zinc-800" />

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/5 rounded-full border border-emerald-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
            <span className="text-[9px] font-black text-emerald-500/80 uppercase tracking-widest">Router Online</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Subtle Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
           <div className="absolute -top-[10%] -left-[5%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px]" />
           <div className="absolute bottom-[10%] -right-[5%] w-[30%] h-[30%] bg-emerald-500/10 rounded-full blur-[120px]" />
        </div>

        {/* Left Sidebar: Context & Logs */}
        <aside className="w-72 border-r border-zinc-800/50 flex flex-col bg-zinc-900/20 backdrop-blur-sm z-10">
          <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar">
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-zinc-400 mb-2">
                <Database size={14} />
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em]">Infrastructure</h2>
              </div>
              <p className="text-[11px] text-zinc-500 leading-relaxed font-medium">
                The <span className="text-zinc-300">Provider Registry</span> is your gateway to global LLM capacity. Changes made here are reflected instantly across all agentic clusters.
              </p>
              <div className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                <div className="text-[9px] text-zinc-500 uppercase font-bold mb-2">Security Note</div>
                <div className="text-[10px] text-zinc-400 leading-relaxed italic">
                  "API keys are retrieved from secure environment variables. Never commit raw keys to the database."
                </div>
              </div>
            </section>

            <div className="h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

            <section className="space-y-4">
              <div className="flex items-center gap-2 text-zinc-400 mb-2">
                <Activity size={14} />
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em]">Orchestration Log</h2>
              </div>
              <div className="space-y-2">
                {[
                  { time: '18:05', msg: 'Grid: Inline state sync', type: 'info' },
                  { time: '17:58', msg: 'MAB: Weight recalibration', type: 'success' },
                  { time: '17:42', msg: 'Auth: Keys rotation check', type: 'info' },
                  { time: '17:30', msg: 'Registry: DeepSeek Added', type: 'success' },
                ].map((log, i) => (
                  <div key={i} className="text-[10px] font-mono p-2.5 rounded-lg bg-zinc-900/30 border border-zinc-800/50 flex gap-3 transition-colors hover:bg-zinc-800/30">
                    <span className="text-zinc-600">[{log.time}]</span>
                    <span className={cn(
                        "font-medium",
                        log.type === 'success' ? 'text-emerald-400/80' :
                        log.type === 'warning' ? 'text-amber-400/80' : 'text-indigo-400/80'
                    )}>{log.msg}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
          
          <div className="mt-auto p-6 bg-zinc-900/40 border-t border-zinc-800/50">
            <div className="flex items-center justify-between text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">
                <span>System Status</span>
                <span className="text-emerald-500 flex items-center gap-1">
                  <div className="w-1 h-1 rounded-full bg-emerald-500" /> Nominal
                </span>
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <div className="flex-1 p-8 overflow-y-auto bg-transparent z-10 custom-scrollbar">
            <div className="max-w-[1400px] mx-auto h-full flex flex-col">
                {activeTab === 'registry' ? (
                  <div className="flex-1 flex flex-col space-y-6">
                    <header className="flex justify-between items-end">
                        <div>
                          <h2 className="text-2xl font-black tracking-tighter text-white">Provider Registry</h2>
                          <p className="text-zinc-500 text-sm mt-1 font-medium">Manage connectivity, financial guardrails, and discovery settings for all AI providers.</p>
                        </div>
                    </header>
                    <div className="flex-1 min-h-0">
                      <ProviderManagementGrid />
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col space-y-6">
                    <header>
                        <h2 className="text-2xl font-black tracking-tighter text-white">Multi-Armed Bandit Analytics</h2>
                        <p className="text-zinc-500 text-sm mt-1 font-medium">Real-time learning metrics and utility preference ranking across all active providers.</p>
                    </header>
                    <div className="flex-1 min-h-[600px] bg-zinc-900/40 rounded-2xl border border-zinc-800/50 p-8 backdrop-blur-sm">
                        <ProviderHealth />
                    </div>
                  </div>
                )}
            </div>
        </div>
      </main>
    </div>
  );
};

export default ControlPlane;

