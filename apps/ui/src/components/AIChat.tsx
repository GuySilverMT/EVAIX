import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import { SmartContainer } from './nebula/containers/SmartContainer.js';
import type { TerminalMessage } from '@repo/common/agent';

interface AIChatProps {
  logs?: TerminalMessage[];
  onInput?: (input: string) => void;
  isRunning?: boolean;
}

export const AIChat: React.FC<AIChatProps> = ({ logs = [], onInput = () => {}, isRunning = false }) => {
  const [inputVal, setInputVal] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, isRunning]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || isRunning) return;
    onInput(inputVal);
    setInputVal('');
  };

  return (
    <SmartContainer 
      type="CHAT" 
      title="AI Assistant"
      extraActions={
        <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] font-mono uppercase tracking-wider">
          <Sparkles size={12} className="text-[var(--color-primary)] animate-pulse" />
          <span>Active Session</span>
        </div>
      }
    >
      {(registerContext) => {
        // Register context for RAG / Agent context inclusion
        registerContext(() => {
          if (logs.length === 0) return "";
          return logs.map(l => `${l.type === 'user' ? 'User' : 'AI'}: ${l.message}`).join('\n');
        });

        return (
          <div className="flex flex-col h-full bg-zinc-950 font-sans text-zinc-200">
            {/* Message Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
              {logs.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 opacity-60">
                  <Bot size={36} className="text-[var(--color-primary)] animate-bounce" />
                  <p className="text-xs font-semibold text-zinc-400">Start a conversation with EVAIX AI</p>
                  <p className="text-[10px] text-zinc-500 max-w-[200px]">Ask questions, write code, or request layout modifications.</p>
                </div>
              )}
              {logs.map((log, index) => {
                const isUser = log.type === 'user' || log.message.startsWith('Goal:');
                return (
                  <div key={index} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                    {!isUser && (
                      <div className="w-6 h-6 rounded-full bg-indigo-950/50 border border-indigo-500/30 flex items-center justify-center shrink-0">
                        <Bot size={12} className="text-indigo-400" />
                      </div>
                    )}
                    <div className={`max-w-[80%] rounded-lg p-3 text-xs leading-relaxed font-mono ${
                      isUser 
                        ? 'bg-[var(--color-primary)] text-black font-semibold rounded-br-none shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.2)]' 
                        : 'bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-bl-none'
                    }`}>
                      {log.message}
                    </div>
                    {isUser && (
                      <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                        <User size={12} className="text-zinc-300" />
                      </div>
                    )}
                  </div>
                );
              })}
              {isRunning && (
                <div className="flex gap-3 justify-start">
                  <div className="w-6 h-6 rounded-full bg-indigo-950/50 border border-indigo-500/30 flex items-center justify-center shrink-0 animate-pulse">
                    <Bot size={12} className="text-indigo-400" />
                  </div>
                  <div className="bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-lg rounded-bl-none p-3 text-xs flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="font-mono text-[10px]">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="p-3 border-t border-zinc-900 bg-zinc-950 flex gap-2 shrink-0">
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                disabled={isRunning}
                placeholder="Ask me anything..."
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-white outline-none focus:border-[var(--color-primary)] placeholder:text-zinc-600 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!inputVal.trim() || isRunning}
                className="bg-[var(--color-primary)] text-black p-2 rounded flex items-center justify-center hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        );
      }}
    </SmartContainer>
  );
};
