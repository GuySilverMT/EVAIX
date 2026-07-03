import React, { useState } from 'react';
import { trpc } from '../utils/trpc.js';

export const AIChat = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);

  // Hook into the tRPC router we just built
  const architectMutation = trpc.agent.invokeRoleArchitect.useMutation({
    onSuccess: (data) => {
      // Append Mastra's response to the chat window
      setMessages((prev) => [...prev, { role: 'agent', content: data.response || '' }]);
      console.log('Mastra Tool Execution Results:', data.toolResults);
    },
    onError: (error) => {
      console.error('Mastra routing failed:', error.message);
    },
  });

  const isLoading = architectMutation.isLoading || (architectMutation as any).isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Show user message instantly
    setMessages((prev) => [...prev, { role: 'user', content: input }]);

    // 🚀 ROUTE THE INTENT TO MASTRA
    architectMutation.mutate({ intent: input });
    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 p-4 border border-zinc-800 rounded">
      <div className="flex-1 overflow-y-auto mb-4 space-y-2 text-sm text-zinc-300 min-h-[200px] max-h-[500px]">
        {messages.length === 0 ? (
          <div className="text-zinc-500 font-mono text-xs text-center pt-8">
            Start a conversation with the Role Architect agent.
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={msg.role === 'user' ? 'text-emerald-400 font-mono' : 'text-zinc-300'}>
              <span className="opacity-50">[{msg.role.toUpperCase()}]: </span>
              {msg.content}
            </div>
          ))
        )}
        {isLoading && (
          <div className="text-zinc-500 font-mono text-xs animate-pulse">
            [ARCHITECT]: Evolving Agent DNA...
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g., Build me a Python Backend Developer agent..."
          className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-xs text-white focus:border-emerald-500 outline-none"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs text-white font-bold rounded disabled:opacity-50"
        >
          EXECUTE
        </button>
      </form>
    </div>
  );
};
