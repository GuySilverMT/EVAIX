import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { trpc } from '../../utils/trpc.js';
import type { RoleFormState, Model, Role } from '../../types/role.js';
import { DEFAULT_ROLE_FORM_DATA } from '../../constants.js';
import {
    Save, Trash2, Sparkles,
    Fingerprint, Cpu, Shield, Globe, Wrench, Eye,
    FileText, Plus, X as CloseIcon, Bot, Download
} from 'lucide-react';
import { toast } from 'sonner';
import { CompactCategorizer } from './components/CompactCategorizer.js';
import { ModelFilter } from './components/ModelFilter.js';
import { NaturalParameterTuner } from './components/NaturalParameterTuner.js';
import { RoleToolSelector } from '../../components/role/RoleToolSelector.js';
import { SuperAiButton } from '../../components/ui/SuperAiButton.js';
import { PromptPreview } from './components/PromptPreview.js';
import { ToolPromptEditor } from './components/ToolPromptEditor.js';
import { cn } from '../../lib/utils.js';

type LabTab = 'identity' | 'behavior' | 'cortex' | 'tools' | 'tuning' | 'governance' | 'context' | 'preview';

export const AgentDNAlab: React.FC<{ embeddedMode?: boolean, roleId?: string, onRoleChange?: (roleId: string) => void }> = ({ embeddedMode: _embeddedMode = false, roleId, onRoleChange }) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
    const [formData, setFormData] = useState<RoleFormState>(DEFAULT_ROLE_FORM_DATA);
    const [activeTab, setActiveTab] = useState<LabTab>('identity');
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [editingTool, setEditingTool] = useState<string | null>(null);

    const utils = trpc.useContext();
    const { data: roles, isLoading: rolesLoading } = trpc.roles.list.useQuery();
    const { data: categories } = trpc.roles.listCategories.useQuery();
    const { data: registry } = trpc.orchestrator.getActiveRegistryData.useQuery();
    const { data: providers } = trpc.providers.list.useQuery();

    const models = useMemo(() => {
        if (!registry) return [] as Model[];
        let rows: Model[] = [];
        if (Array.isArray(registry)) {
            rows = registry as Model[];
        } else {
            const r = registry as Record<string, unknown>;
            rows = (r.rows || r.models || []) as Model[];
        }
        return rows.filter(m => providers?.some(p => p.id === m.providerId && p.isEnabled) || !m.providerId);
    }, [registry, providers]);

    const updateRoleMutation = trpc.roles.upsert.useMutation({
        onSuccess: () => {
            void utils.roles.list.invalidate();
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
            toast.success('DNA Synchronized');
        },
        onError: (e: { message: string }) => {
            setSaveStatus('error');
            toast.error(`Sync Failed: ${e.message}`);
        }
    });

    const createRoleMutation = trpc.roles.create.useMutation({
        onSuccess: (newRole) => {
            void utils.roles.list.invalidate();
            setSelectedRoleId(newRole.id);
            onRoleChange?.(newRole.id);
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
            toast.success('New Agent Created');
        }
    });

    const deleteRoleMutation = trpc.roles.delete.useMutation({
        onSuccess: () => {
            void utils.roles.list.invalidate();
            setSelectedRoleId(null);
            setFormData(DEFAULT_ROLE_FORM_DATA);
            toast.success('Subject Terminated');
        }
    });

    const handleSelectRole = useCallback((id: string) => {
        const role = roles?.find(r => r.id === id) as unknown as Role;
        if (role) {
            setSelectedRoleId(id);
            onRoleChange?.(id);

            const dnaBase = (role.dna as unknown as Record<string, unknown>) || {};

            setFormData({
                name: role.name,
                basePrompt: role.basePrompt,
                category: role.category?.name || role.categoryString || 'Uncategorized',
                minContext: role.minContext || 0,
                maxContext: role.maxContext || 128000,
                needsVision: role.needsVision || false,
                needsReasoning: role.needsReasoning || false,
                needsCoding: role.needsCoding || false,
                needsTools: role.needsTools || false,
                needsJson: role.needsJson || false,
                needsUncensored: role.needsUncensored || false,
                needsImageGeneration: role.needsImageGeneration || false,
                tools: (role.tools as unknown as string[]) || [],
                defaultTemperature: role.defaultTemperature || 0.7,
                defaultMaxTokens: role.defaultMaxTokens || 2048,
                defaultTopP: role.defaultTopP || 1.0,
                defaultFrequencyPenalty: role.defaultFrequencyPenalty || 0.0,
                defaultPresencePenalty: role.defaultPresencePenalty || 0.0,
                defaultStop: role.defaultStop || [],
                defaultSeed: role.defaultSeed,
                defaultResponseFormat: role.defaultResponseFormat || 'text',
                terminalRestrictions: role.terminalRestrictions || { mode: 'blacklist', commands: [] },
                criteria: role.criteria || {},
                orchestrationConfig: role.orchestrationConfig || { requiresCheck: false, minPassScore: 80 },
                memoryConfig: role.memoryConfig || { useProjectMemory: false, readOnly: false },
                dna: {
                    ...DEFAULT_ROLE_FORM_DATA.dna,
                    ...dnaBase,
                    identity: {
                        ...DEFAULT_ROLE_FORM_DATA.dna.identity,
                        ...(dnaBase.identity || {})
                    },
                    cortex: {
                        ...DEFAULT_ROLE_FORM_DATA.dna.cortex,
                        ...(dnaBase.cortex || {})
                    },
                    governance: {
                        ...DEFAULT_ROLE_FORM_DATA.dna.governance,
                        ...(dnaBase.governance || {})
                    },
                    context: {
                        ...DEFAULT_ROLE_FORM_DATA.dna.context,
                        ...(dnaBase.context || {})
                    },
                    behavior: {
                        ...DEFAULT_ROLE_FORM_DATA.dna.behavior,
                        ...(dnaBase.behavior || {})
                    }
                }
            });
        }
    }, [roles]);

    const handleExportDNA = () => {
        if (!selectedRoleId) return;
        const blob = new Blob([JSON.stringify(formData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `agent-dna-${formData.name.toLowerCase().replace(/\s+/g, '-')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('DNA Schema Exported');
    };

    // Sync with URL params
    useEffect(() => {
        const roleId = searchParams.get('roleId');
        if (roleId && roles) {
            handleSelectRole(roleId);
            // Clear param after selection to avoid sticky state on manual selection
            const newParams = new URLSearchParams(searchParams);
            newParams.delete('roleId');
            setSearchParams(newParams, { replace: true });
        }
    }, [roles, searchParams, setSearchParams, handleSelectRole]);

    useEffect(() => {
        if (roleId && roleId !== selectedRoleId) {
            handleSelectRole(roleId);
        }
    }, [roleId, selectedRoleId, handleSelectRole]);

    const handleSave = () => {
        setSaveStatus('saving');
        if (selectedRoleId) {
            updateRoleMutation.mutate({ id: selectedRoleId, ...formData });
        } else {
            createRoleMutation.mutate(formData);
        }
    };

    const categorizerItems = useMemo(() => {
        return ((roles as unknown as Role[]) || []).map((r) => ({
            id: r.id,
            label: r.name,
            categoryId: r.category?.name || r.categoryString || 'Uncategorized',
            icon: <Fingerprint size={12} className="text-[var(--color-primary)]" />
        }));
    }, [roles]);

    const categoryNames = useMemo(() => {
        const names = new Set<string>();
        (categories || []).forEach(c => names.add(c.name));
        return Array.from(names);
    }, [categories]);

    if (rolesLoading) return <div className="p-8 animate-pulse text-[var(--text-muted)]">Initializing DNA Sequencing...</div>;

    return (
        <div className="flex h-full w-full bg-[var(--bg-background)] overflow-hidden">

            {/* 1. LIBRARY SIDEBAR */}
            <CompactCategorizer
                title="Agent Registry"
                items={categorizerItems}
                categories={categoryNames}
                selectedId={selectedRoleId}
                onSelect={handleSelectRole}
                onAddItem={() => {
                    setSelectedRoleId(null);
                    setFormData(DEFAULT_ROLE_FORM_DATA);
                    setActiveTab('identity');
                }}
                className="w-64 border-r border-[var(--border-color)] hidden lg:block"
            />

            {/* 2. MAIN WORKSPACE */}
            <div className="flex-1 flex flex-col min-w-0">

                <div className="h-16 flex items-center justify-between px-6 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/30">
                    <div className="flex flex-col">
                        <input
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="bg-transparent text-xl font-bold text-[var(--text-primary)] outline-none border-b border-transparent focus:border-[var(--color-primary)] transition-colors"
                            placeholder="Subject Name..."
                        />
                        <span className="text-[10px] text-[var(--text-muted)] font-mono uppercase tracking-widest">
                            {selectedRoleId ? `ID: ${selectedRoleId}` : 'NEW AGENT DETECTED'}
                        </span>
                    </div>

                    <div className="flex gap-2">
                        {selectedRoleId && (
                            <>
                                <button
                                    onClick={handleExportDNA}
                                    className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)] rounded transition-colors"
                                    title="Export DNA"
                                >
                                    <Download size={16} />
                                </button>
                                <button
                                    onClick={() => { if (confirm('Terminate Subject?')) deleteRoleMutation.mutate({ id: selectedRoleId }) }}
                                    className="p-2 text-[var(--color-error)] hover:bg-[var(--color-error)]/10 rounded transition-colors"
                                    title="Delete Agent"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </>
                        )}
                        <button
                            onClick={handleSave}
                            disabled={saveStatus === 'saving'}
                            className={cn(
                                "flex items-center gap-2 px-6 py-2 rounded font-bold text-xs transition-all",
                                saveStatus === 'saved' ? 'bg-[var(--color-success)] text-white' : 'bg-[var(--color-primary)] text-white hover:opacity-90'
                            )}
                        >
                            {saveStatus === 'saving' ? <Sparkles size={14} className="animate-spin" /> : <Save size={14} />}
                            {saveStatus === 'saving' ? 'SYNCING...' : saveStatus === 'saved' ? 'SYNCED' : 'SYNCHRONIZE DNA'}
                        </button>
                    </div>
                </div>

                <div className="flex px-6 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/10">
                    <DNATab active={activeTab === 'identity'} onClick={() => setActiveTab('identity')} icon={Fingerprint} label="Identity" color="blue" />
                    <DNATab active={activeTab === 'behavior'} onClick={() => setActiveTab('behavior')} icon={Bot} label="Behavior" color="orange" />
                    <DNATab active={activeTab === 'cortex'} onClick={() => setActiveTab('cortex')} icon={Cpu} label="Cortex" color="purple" />
                    <DNATab active={activeTab === 'tools'} onClick={() => setActiveTab('tools')} icon={Wrench} label="Tools" color="orange" />
                    <DNATab active={activeTab === 'tuning'} onClick={() => setActiveTab('tuning')} icon={Sparkles} label="Neural Tuning" color="cyan" />
                    <DNATab active={activeTab === 'governance'} onClick={() => setActiveTab('governance')} icon={Shield} label="Governance" color="red" />
                    <DNATab active={activeTab === 'context'} onClick={() => setActiveTab('context')} icon={Globe} label="Environment" color="green" />
                    <DNATab active={activeTab === 'preview'} onClick={() => setActiveTab('preview')} icon={Eye} label="Preview" color="blue" />
                </div>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="max-w-4xl mx-auto pb-20">

                        {activeTab === 'identity' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-widest pl-1">Codename Persona</label>
                                        <input
                                            value={formData.dna.identity.personaName}
                                            onChange={e => setFormData({ ...formData, dna: { ...formData.dna, identity: { ...formData.dna.identity, personaName: e.target.value } } })}
                                            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded p-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--color-primary)]"
                                            placeholder="e.g. Architect Prime"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-widest pl-1">Style Vector</label>
                                        <select
                                            value={formData.dna.identity.style}
                                            onChange={e => setFormData({ ...formData, dna: { ...formData.dna, identity: { ...formData.dna.identity, style: e.target.value } } })}
                                            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded p-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--color-primary)]"
                                        >
                                            <option value="PROFESSIONAL_CONCISE">Professional & Concise</option>
                                            <option value="SOCRATIC">Socratic (Questioning)</option>
                                            <option value="FRIENDLY_HELPFUL">Friendly & Helpful</option>
                                            <option value="ACADEMIC_FORMAL">Academic & Formal</option>
                                            <option value="CREATIVE">Creative (Unconventional)</option>
                                            <option value="AGGRESSIVE_AUDITOR">Aggressive Auditor</option>
                                        </select>
                                    </div>
                                </div>

                                <section className="flex-1 space-y-2 flex flex-col">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-widest">System Prompt (The Soul)</label>
                                        <div className="flex items-center gap-2">
                                            <SuperAiButton
                                                contextId={`role-prompt-${formData.name}`}
                                                side="left"
                                                onGenerate={(p, opts) => {
                                                    void (async () => {
                                                        const res = await utils.client.roles.generatePrompt.mutate({
                                                            name: formData.name,
                                                            goal: p,
                                                            context: formData.basePrompt,
                                                            capabilities: {
                                                                vision: formData.needsVision,
                                                                reasoning: formData.needsReasoning,
                                                                coding: formData.needsCoding,
                                                                tools: formData.needsTools
                                                            },
                                                            tools: formData.tools,
                                                            roleId: opts?.roleId
                                                        });
                                                        if (res) setFormData(prev => ({ ...prev, basePrompt: res }));
                                                    })();
                                                }}
                                                defaultPrompt={`Refine the soul of ${formData.name}. Improve clarity and directive power.`}
                                            />
                                        </div>
                                    </div>
                                    <textarea
                                        value={formData.basePrompt}
                                        onChange={e => setFormData({ ...formData, basePrompt: e.target.value })}
                                        className="flex-1 w-full min-h-[300px] bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg p-4 font-mono text-sm leading-relaxed focus:border-[var(--color-primary)] outline-none"
                                        placeholder="Define the personality, rules, and core logic..."
                                    />
                                </section>
                            </div>
                        )}

                        {activeTab === 'behavior' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <section className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-6 space-y-8">
                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-widest block">Thinking Process</label>
                                            <select
                                                value={formData.dna.identity.thinkingProcess}
                                                onChange={e => setFormData({ ...formData, dna: { ...formData.dna, identity: { ...formData.dna.identity, thinkingProcess: e.target.value } } })}
                                                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded p-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--color-primary)]"
                                            >
                                                <option value="SOLO">Solo (Single-Shot)</option>
                                                <option value="CHAIN_OF_THOUGHT">Chain of Thought</option>
                                                <option value="CRITIC_LOOP">Critic Loop (Self-Correcting)</option>
                                                <option value="MULTI_STEP_PLANNING">Multi-Step Planning</option>
                                            </select>
                                        </div>

                                        <div className="space-y-4 pt-6">
                                            <label className="flex items-center gap-3 cursor-pointer group">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.dna.identity.reflectionEnabled}
                                                    onChange={e => setFormData({ ...formData, dna: { ...formData.dna, identity: { ...formData.dna.identity, reflectionEnabled: e.target.checked } } })}
                                                    className="w-4 h-4 rounded appearance-none border border-[var(--border-color)] checked:bg-[var(--color-primary)] transition-all"
                                                />
                                                <span className="text-xs font-bold text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">Self-Reflection Mode</span>
                                            </label>

                                            <label className="flex items-center gap-3 cursor-pointer group">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.dna.behavior?.silenceConfirmation}
                                                    onChange={e => setFormData({ ...formData, dna: { ...formData.dna, behavior: { ...formData.dna.behavior, silenceConfirmation: e.target.checked } } })}
                                                    className="w-4 h-4 rounded appearance-none border border-[var(--border-color)] checked:bg-[var(--color-primary)] transition-all"
                                                />
                                                <span className="text-xs font-bold text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">Silence Confirmation (Autonomous)</span>
                                            </label>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        )}

                        {activeTab === 'cortex' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-widest block">Agent Execution Mode</label>
                                        <select
                                            value={formData.dna.cortex.executionMode}
                                            onChange={e => setFormData({
                                                ...formData,
                                                dna: {
                                                    ...formData.dna,
                                                    cortex: { ...formData.dna.cortex, executionMode: e.target.value as 'HYBRID_AUTO' | 'JSON_STRICT' | 'CODE_INTERPRETER' }
                                                }
                                            })}
                                            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded p-3 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--color-primary)]"
                                        >
                                            <option value="HYBRID_AUTO">Hybrid Auto (Context Aware)</option>
                                            <option value="JSON_STRICT">JSON Strict (Reliable Utility)</option>
                                            <option value="CODE_INTERPRETER">Code Interpreter (Logic & Analysis)</option>
                                        </select>
                                    </div>
                                </div>

                                <ModelFilter
                                    allModels={models}
                                    viewMode="HARD_SELECTION"
                                    className="bg-transparent border-none p-0"
                                    criteria={{
                                        minContext: formData.minContext,
                                        maxContext: formData.maxContext,
                                        mode: 'CHAT',
                                        preferences: {
                                            reasoning: formData.needsReasoning,
                                            uncensored: formData.needsUncensored
                                        },
                                        hardCodedModelId: null
                                    }}
                                    onChange={(crit) => {
                                        setFormData({
                                            ...formData,
                                            minContext: crit.minContext,
                                            maxContext: crit.maxContext,
                                            needsReasoning: !!crit.preferences.reasoning,
                                            needsUncensored: !!crit.preferences.uncensored
                                        });
                                    }}
                                />
                            </div>
                        )}

                        {activeTab === 'tuning' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <NaturalParameterTuner
                                    config={{
                                        temperature: formData.defaultTemperature,
                                        topP: formData.defaultTopP,
                                        frequencyPenalty: formData.defaultFrequencyPenalty,
                                        presencePenalty: formData.defaultPresencePenalty
                                    }}
                                    onChange={(cfg) => setFormData({
                                        ...formData,
                                        defaultTemperature: cfg.temperature,
                                        defaultTopP: cfg.topP,
                                        defaultFrequencyPenalty: cfg.frequencyPenalty,
                                        defaultPresencePenalty: cfg.presencePenalty
                                    })}
                                />
                                <div className="space-y-2 bg-[var(--bg-secondary)] p-6 rounded-lg border border-[var(--border-color)]">
                                    <label className="text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-widest block mb-2">Maximum Output Entropy (Tokens)</label>
                                    <input
                                        type="range"
                                        min="256" max="32000" step="256"
                                        value={formData.defaultMaxTokens}
                                        onChange={e => setFormData({ ...formData, defaultMaxTokens: parseInt(e.target.value) })}
                                        className="w-full"
                                    />
                                    <div className="flex justify-between text-[10px] uppercase font-mono text-[var(--text-muted)]">
                                        <span>256</span>
                                        <span className="text-[var(--color-primary)] font-bold">{formData.defaultMaxTokens} Tokens</span>
                                        <span>32000</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'tools' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div className="flex gap-2 lg:gap-6 flex-1">
                                    <RoleToolSelector
                                        selectedTools={formData.tools}
                                        onChange={(tools) => setFormData(prev => ({ ...prev, tools }))}
                                        className="w-full lg:w-80"
                                    />
                                    <div className="flex-1 flex flex-col gap-4">
                                        <div className="flex-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded p-4 overflow-y-auto custom-scrollbar">
                                            <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] block mb-4">Active Toolbelt ({formData.tools.length})</span>
                                            <div className="flex flex-col gap-2">
                                                {formData.tools.map(t => (
                                                    <div key={t} className="flex items-center justify-between p-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg group">
                                                        <div className="flex items-center gap-3">
                                                            <Wrench size={14} className="text-[var(--color-primary)]" />
                                                            <span className="text-xs font-mono font-bold text-[var(--text-primary)]">{t}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => setEditingTool(t)}
                                                                className="text-[10px] font-bold uppercase text-blue-400 hover:text-blue-300"
                                                            >
                                                                Edit Protocol
                                                            </button>
                                                            <button
                                                                onClick={() => setFormData(prev => ({ ...prev, tools: prev.tools.filter(x => x !== t) }))}
                                                                className="text-zinc-500 hover:text-red-400"
                                                            >
                                                                <CloseIcon size={14} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'governance' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-6">
                                    <FileAttachmentList
                                        files={formData.dna.governance.attachedFiles || []}
                                        onUpdate={(files) => setFormData({
                                            ...formData,
                                            dna: {
                                                ...formData.dna,
                                                governance: { ...formData.dna.governance, attachedFiles: files }
                                            }
                                        })}
                                        label="Governance & Policy Nodes"
                                    />
                                </div>
                            </div>
                        )}

                        {activeTab === 'context' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-6">
                                    <FileAttachmentList
                                        files={formData.dna.context.attachedFiles || []}
                                        onUpdate={(files) => setFormData({
                                            ...formData,
                                            dna: {
                                                ...formData.dna,
                                                context: { ...formData.dna.context, attachedFiles: files }
                                            }
                                        })}
                                        label="Environment Strategy & Knowledge"
                                    />
                                </div>
                            </div>
                        )}

                        {activeTab === 'preview' && (
                            <PromptPreview
                                basePrompt={formData.basePrompt}
                                selectedTools={formData.tools}
                            />
                        )}

                    </div>
                </div>
            </div>

            {editingTool && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-20">
                    <div className="w-full max-w-4xl h-full">
                        <ToolPromptEditor
                            toolName={editingTool}
                            onClose={() => setEditingTool(null)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

const FileAttachmentList = ({ files, onUpdate, label }: { files: string[], onUpdate: (f: string[]) => void, label: string }) => {
    const [input, setInput] = useState('');
    return (
        <div className="space-y-4">
            <label className="text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-widest">{label}</label>
            <div className="flex gap-2">
                <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && input.trim() && (onUpdate([...files, input.trim()]), setInput(''))}
                    placeholder="Enter file path (e.g. /docs/api.md)..."
                    className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--color-primary)] font-mono"
                />
                <button
                    onClick={() => input.trim() && (onUpdate([...files, input.trim()]), setInput(''))}
                    className="bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-4 rounded text-xs font-bold hover:bg-[var(--color-primary)]/20 transition-colors"
                >
                    <Plus size={16} />
                </button>
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                {files.map(f => (
                    <div key={f} className="flex items-center justify-between p-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded animate-in slide-in-from-left-2 duration-200">
                        <div className="flex items-center gap-2">
                            <FileText size={14} className="text-zinc-500" />
                            <span className="text-[11px] font-mono text-[var(--text-secondary)]">{f}</span>
                        </div>
                        <button onClick={() => onUpdate(files.filter(x => x !== f))} className="p-1 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-all">
                            <CloseIcon size={14} />
                        </button>
                    </div>
                ))}
                {files.length === 0 && <div className="text-[10px] text-[var(--text-muted)] italic py-4 text-center border border-dashed border-[var(--border-color)] rounded">No files attached to this DNA block.</div>}
            </div>
        </div>
    );
};

const DNATab = ({ active, onClick, icon: Icon, label, color }: { active: boolean, onClick: () => void, icon: React.ElementType, label: string, color: string }) => (
    <button
        type="button"
        onClick={onClick}
        className={cn(
            "flex items-center gap-2 px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-all border-b-2",
            active
                ? `border-[var(--color-${color},var(--color-primary))] text-[var(--color-${color},var(--color-primary))] bg-[var(--bg-primary)]/50`
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        )}
    >
        <Icon size={14} />
        {label}
    </button>
);
