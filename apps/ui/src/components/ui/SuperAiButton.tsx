import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Settings, User, Zap, ArrowRight, X, Eye, EyeOff, Database, StopCircle } from 'lucide-react';
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/react';
import { cn } from '@/lib/utils.js';
import { trpc } from '../../utils/trpc.js';
import { useWorkspaceStore } from '../../stores/workspace.store.js';
import { z } from 'zod';
import { toast } from 'sonner';

// Lazy load the role selector
import CompactRoleSelector from '../CompactRoleSelector.js';

type ButtonState = 'idle' | 'active' | 'menu' | 'role_select' | 'config';

type SuperAiButtonProps = {
  contextId?: string | Record<string, unknown>; // The local context ID (e.g. "users-table", "terminal-1")
  contextGetter?: () => string | Record<string, unknown>; // A dynamic context getter
  onSuccess?: (response: unknown) => void;
  className?: string;
  style?: React.CSSProperties;
  expandUp?: boolean;
  side?: 'left' | 'right'; // Expansion direction
  onGenerate?: (prompt: string, options?: { roleId?: string }) => void;
  defaultPrompt?: string;
  defaultRoleId?: string;
  label?: string;
  selectedRoleId?: string | null;
  onRoleSelect?: (roleId: string) => void;
  onClick?: () => void;
  intent?: 'prompt' | 'mutation' | 'navigation';
  isLoading?: boolean;
};


export const SuperAiButton: React.FC<SuperAiButtonProps> = ({
  contextId,
  contextGetter,
  onSuccess,
  className,
  style,
  expandUp = false,
  side = 'right', // CHANGE DEFAULT TO RIGHT (expands into the screen)
  onGenerate,
  defaultPrompt = '',
  defaultRoleId,
  label,
  selectedRoleId: controlledRoleId,
  onRoleSelect,
  onClick,
  intent = 'prompt',
  isLoading = false
}) => {
  const [state, setState] = useState<ButtonState>('idle');
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [localRoleId, setLocalRoleId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const abortController = useRef<AbortController | null>(null);

  const selectedRoleId = controlledRoleId !== undefined ? controlledRoleId : localRoleId;

  const inputRef = useRef<HTMLInputElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  // Workspace Store for Global Context
  const { aiContext, setAiContext } = useWorkspaceStore();

  // Floating UI for menu positioning
  const { refs, floatingStyles } = useFloating({
    placement: expandUp ? 'top-start' : 'bottom-start',
    middleware: [
      offset(12),
      flip(),
      shift({ padding: 10 }),
    ],
    whileElementsMounted: autoUpdate,
  });

  // Dispatch mutation
  const dispatchMutation = trpc.orchestrator.dispatch.useMutation({
    onSuccess: (data) => {
      console.log('✅ Command dispatched:', data);

      // Global Interceptor for mutate_ui_node
      if (data && typeof data === 'object') {
         const responseStr = (data as any)?.text || (data as any)?.content;
         if (responseStr) {
             try {
                 const parsed = JSON.parse(responseStr);
                 if (parsed?.ui_action?.tool === 'mutate_ui_node') {
                     const { nodeId, action, payload } = parsed.ui_action;
                     import('../../stores/agenticWorkspace.store.js').then(({ useAgenticWorkspaceStore }) => {
                         const applyMutation = useAgenticWorkspaceStore.getState().nodes[nodeId]?.applyMutation;
                         if (applyMutation) {
                             void applyMutation({ action, payload });
                         }
                     });
                 }
             } catch (e) {
                 // Not JSON or missing ui_action, proceed normally
             }
         }
      }

      if (onSuccess) onSuccess(data);
      // setPrompt(''); // Keep prompt for reuse per user request
      setState('idle');
      setIsRunning(false);
      abortController.current = null;
    },
    onError: (error) => {
      console.error('❌ Dispatch failed:', error);
      setIsRunning(false);
      abortController.current = null;
    },
  });

  // Focus input when entering active state
  useEffect(() => {
    if (state === 'active' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [state]);

  // GENERATE HANDLER
  const handleGenerate = () => {
    // Relaxed Check: If onGenerate is active (parent handles logic), we allow empty prompt
    if (!prompt.trim() && !onGenerate) return;

    setIsRunning(true);
    abortController.current = new AbortController();

    // Construct the full payload
    const effectiveContext = contextGetter ? contextGetter() : contextId;
    const payload = {
      prompt,
      // Prefer local context (stringified if object), fallback to global
      contextId: typeof effectiveContext === 'object' ? JSON.stringify(effectiveContext) : (effectiveContext || aiContext.scope),
      roleId: selectedRoleId || undefined,
      // Include flags if needed by the backend
      flags: {
        limitContext: aiContext.isLimiting,
        injectState: aiContext.injectedState
      }
    };

    if (onGenerate) {
      onGenerate(prompt, { roleId: selectedRoleId || undefined });
    } else {
      dispatchMutation.mutate(payload);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleGenerate();
    } else if (e.key === 'Escape') {
      setState('idle');
      setPrompt('');
    }
  };

  // Persistent Role Selection
  useEffect(() => {
    const saved = localStorage.getItem('superAiButton_defaultRole');
    if (saved) {
      setLocalRoleId(saved);
    } else if (defaultRoleId) {
      setLocalRoleId(defaultRoleId);
    }
  }, [defaultRoleId]);

  const handleRoleSelect = (roleId: string) => {
    // Resilience Check: Add a Zod check to the role selection to prevent "String Handoff" errors.
    const result = z.string().min(1).safeParse(roleId);
    if (!result.success) {
      console.error('❌ Invalid role selection:', roleId);
      return;
    }

    const cleanRoleId = result.data;
    setLocalRoleId(cleanRoleId);
    localStorage.setItem('superAiButton_defaultRole', cleanRoleId);
    if (onRoleSelect) onRoleSelect(cleanRoleId);
    setState('active'); // Return to prompt view after selection
  };

  // Left Click = Magic Run (User Request)
  const handleLeftClick = () => {
    if (isLoading || dispatchMutation.isLoading || isRunning) {
      // If running, stop
      if (isRunning) {
        setIsRunning(false);
        toast.info("Cancelling run...");
      }
      return;
    }

    if (onClick) {
      onClick();
      return;
    }

    if (!selectedRoleId) {
      toast.error("Please right-click to assign an AI role.");
      return;
    }

    // If we have a prompt or onGenerate, try to run.
    if (!prompt.trim() && !defaultPrompt && !onGenerate) {
      setState(prev => prev === 'active' ? 'idle' : 'active');
      return;
    }

    // If we have a prompt (or defaultPrompt) OR onGenerate, run it.
    handleGenerate();

    // Visual feedback
    if (buttonRef.current) {
      buttonRef.current.classList.add('animate-ping');
      setTimeout(() => buttonRef.current?.classList.remove('animate-ping'), 500);
    }
  };

  // Right Click = Open Menu / Settings / Role Selector
  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setState(state === 'role_select' ? 'idle' : 'role_select');
  };

  // Determine button aesthetic based on context
  const isContextLimited = aiContext.isLimiting;

  // Visual Feedback for Context
  const contextLabel = useMemo(() => {
    if (!contextId) return "Global System";
    if (typeof contextId === 'string') return contextId;
    return "Local Context";
  }, [contextId]);

  return (
    <div className={cn("relative inline-flex z-50", className)}>
      {/* Main Button */}
      <button
        ref={(node) => {
          buttonRef.current = node;
          refs.setReference(node);
        }}
        onClick={handleLeftClick}
        onContextMenu={handleRightClick}
        className={cn(
          "h-7 flex items-center justify-center rounded-sm transition-all border relative z-[51]", // Removed forced w-7 to allow label expansion
          !label && "w-7",
          "shadow-sm hover:shadow-md active:scale-95 group",
          state !== 'idle'
            ? "bg-[var(--color-background-secondary)] border-[var(--color-primary)] text-[var(--color-primary)]"
            : isContextLimited
              ? "bg-zinc-700 text-zinc-300 border-zinc-600"
              : "bg-gradient-to-br from-[var(--color-primary)] to-purple-600 text-white border-transparent"
        )}
        style={style}
        title={`AI Context: ${contextLabel} (Right-click for menu)`}
      >
        {isLoading || dispatchMutation.isLoading || isRunning ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="flex items-center justify-center"
          >
            {isRunning ? <StopCircle size={14} className="text-red-400" /> : <Sparkles size={14} />}
          </motion.div>
        ) : state === 'menu' || state === 'role_select' || state === 'config' ? (
          <X size={14} />
        ) : (
          <div className="flex items-center gap-1.5 px-1.5">
            <Sparkles size={14} className={cn(isContextLimited && "opacity-50")} />
            {label && <span className="text-[10px] font-black uppercase tracking-widest pt-0.5">{label}</span>}
          </div>
        )}
      </button>

      {/* Active Input Mode - Expands OUTWARDS */}
      <AnimatePresence>
        {state === 'active' && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={side === 'left' ? { right: '100%', marginRight: 8 } : { left: '100%', marginLeft: 8 }} // Push OUT, not OVER
            className={cn(
              "absolute top-0 h-7 flex items-center bg-zinc-900/95 backdrop-blur border border-purple-500/50 shadow-2xl z-[60] min-w-[300px]",
              side === 'left' ? "rounded-l-md pr-4 pl-2" : "rounded-r-md pl-4 pr-2"
            )}
          >
            {/* If Left Side: Input first, then button */}
            <input
              ref={inputRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => {
                setTimeout(() => {
                  if (state === 'active' && !prompt.trim()) {
                    setState('idle');
                  }
                }, 200);
              }}
              className="flex-1 min-w-0 bg-transparent text-[var(--color-text)] text-xs px-2 focus:outline-none placeholder:text-[var(--color-text-secondary)]/50"
              placeholder={`Ask AI about ${contextLabel}...`}
              disabled={isRunning}
            />

            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || dispatchMutation.isLoading || isRunning}
              className={cn(
                "text-[var(--color-primary)] hover:text-white px-3 h-full hover:bg-[var(--color-primary)]/20 transition-colors disabled:opacity-50",
                side === 'left' ? "border-r border-[var(--color-border)]/50 order-first" : "border-l border-[var(--color-border)]/50"
              )}
            >
              {dispatchMutation.isLoading || isRunning ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <Sparkles size={12} />
                </motion.div>
              ) : (
                <ArrowRight size={12} />
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bloom Menu */}
      {state === 'menu' && (
        <div
          ref={refs.setFloating}
          style={floatingStyles}
          className="z-[60]" // Force high z-index
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className={cn(
              "bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl overflow-hidden z-[60] min-w-[160px]",
              side === 'left' ? "right-0" : "left-0" // Align to the edge of the button
            )}
          >
            <div className="grid grid-cols-2 gap-1 p-1">
              <MenuButton
                icon={<Zap size={14} />}
                label="Prompt"
                onClick={() => setState('active')}
              />
              <MenuButton
                icon={<User size={14} />}
                label="Roles"
                onClick={() => setState('role_select')}
              />
              <MenuButton
                icon={<Settings size={14} />}
                label="Config"
                onClick={() => setState('config')}
              />
              <MenuButton
                icon={<Database size={14} />}
                label="Data"
                onClick={() => console.log('Data clicked')}
              />
            </div>
          </motion.div>
        </div>
      )}

      {/* Sub-Panels (Role Selector / Config) */}
      {(state === 'role_select' || state === 'config') && (
        <div
          ref={refs.setFloating}
          style={floatingStyles}
          className="z-[60]"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="w-80 bg-[var(--color-background-secondary)] border border-[var(--color-border)] rounded-lg shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex justify-between items-center px-2 py-1.5 bg-[var(--color-background)]/30 border-b border-[var(--color-border)]">
              <span className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
                {state === 'role_select' ? 'Select Role' : 'Context Configuration'}
              </span>
              <button
                onClick={() => setState('menu')}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors p-1"
              >
                <X size={12} />
              </button>
            </div>

            {/* Content */}
            <div className="max-h-80 overflow-y-auto custom-scrollbar">
              {state === 'role_select' && (
                <CompactRoleSelector
                  onSelect={handleRoleSelect}
                  selectedRoleId={selectedRoleId}
                />
              )}
              {state === 'config' && (
                <div className="p-2 space-y-1">
                  <div className="p-2 bg-[var(--color-background)]/50 rounded mb-2">
                    <div className="flex items-center justify-between text-[10px] text-[var(--color-text-muted)] mb-1">
                      <span>Target Scope:</span>
                      <span className="font-mono text-[var(--color-text)] truncate max-w-[120px]" title={contextLabel}>{contextLabel}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-[var(--color-text-muted)]">
                      <span>Selected Role:</span>
                      <span className="font-mono text-[var(--color-text)]">{selectedRoleId || 'Auto'}</span>
                    </div>
                  </div>

                  <h4 className="text-[9px] font-bold uppercase text-[var(--color-text-muted)] px-1 mb-1">Visibility</h4>
                  <button
                    onClick={() => setAiContext({ isLimiting: !aiContext.isLimiting })}
                    className={cn(
                      "w-full flex items-center justify-between px-2 py-1.5 rounded text-[10px] transition-all border",
                      aiContext.isLimiting
                        ? "bg-purple-900/40 border-purple-500/30 text-purple-200"
                        : "bg-transparent border-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-text)]/5"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {aiContext.isLimiting ? <EyeOff size={12} /> : <Eye size={12} />}
                      <span>Limit AI Visibility</span>
                    </div>
                    <div className={cn("w-2 h-2 rounded-full", aiContext.isLimiting ? "bg-purple-500 shadow-[0_0_5px_rgba(168,85,247,0.5)]" : "bg-[var(--color-border)]")} />
                  </button>

                  <h4 className="text-[9px] font-bold uppercase text-[var(--color-text-muted)] px-1 mt-2 mb-1">Data Injection</h4>
                  <button
                    onClick={() => setAiContext({ injectedState: !aiContext.injectedState })}
                    className={cn(
                      "w-full flex items-center justify-between px-2 py-1.5 rounded text-[10px] transition-all border",
                      aiContext.injectedState
                        ? "bg-blue-900/40 border-blue-500/30 text-blue-200"
                        : "bg-transparent border-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-text)]/5"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Database size={12} />
                      <span>Inject Local State</span>
                    </div>
                    <div className={cn("w-2 h-2 rounded-full", aiContext.injectedState ? "bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.5)]" : "bg-[var(--color-border)]")} />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

// Menu Button Component (High Density)
const MenuButton = ({
  icon,
  label,
  onClick
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center justify-center w-full h-12 hover:bg-white/5 rounded transition-colors text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] border border-transparent hover:border-[var(--color-border)]/50 gap-0.5"
    title={label}
  >
    {icon}
    <span className="text-[9px] font-medium">{label}</span>
  </button>
);
