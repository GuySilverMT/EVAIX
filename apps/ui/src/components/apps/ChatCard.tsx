import React, { useState } from 'react';
import { Send, Sparkles, Bot, User, RefreshCw, Copy, ThumbsUp } from 'lucide-react';
import { toast } from 'sonner';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export function ChatCard() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'ai',
      text: 'Hello! I am your EVAIX Cooperative Assistant powered by Gemini. How can I help you build, analyze, or write today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: input,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    setTimeout(() => {
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: `I have processed your query: "${input}". The EVAIX workspace grid is synced and ready for further execution.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiMsg]);
      setLoading(false);
    }, 800);
  };

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950 font-sans text-zinc-100 overflow-hidden">
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((msg) => (
          <div 
            key={msg.id}
            className={`flex gap-3 max-w-[88%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
          >
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs shrink-0 ${
              msg.sender === 'ai' 
                ? 'bg-gradient-to-tr from-indigo-600 to-purple-500 text-white shadow-md' 
                : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
            }`}>
              {msg.sender === 'ai' ? <Sparkles size={14} /> : <User size={14} />}
            </div>

            {/* Content Bubble */}
            <div className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-none'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-bl-none shadow-sm'
              }`}>
                {msg.text}
              </div>
              <div className="flex items-center gap-2 mt-1 px-1">
                <span className="text-[9px] text-zinc-500 font-mono">{msg.timestamp}</span>
                {msg.sender === 'ai' && (
                  <div className="flex items-center gap-1 text-zinc-600 hover:text-zinc-400">
                    <button onClick={() => { navigator.clipboard.writeText(msg.text); toast.success('Copied to clipboard'); }}>
                      <Copy size={10} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 mr-auto items-center text-zinc-500 text-xs">
            <div className="w-8 h-8 rounded-full bg-indigo-950 border border-indigo-800 flex items-center justify-center animate-pulse text-indigo-400">
              <Sparkles size={14} />
            </div>
            <span className="animate-pulse font-mono text-[10px] uppercase tracking-wider">Gemini Thinking...</span>
          </div>
        )}
      </div>

      {/* Quick Prompt Recommendations */}
      <div className="px-4 py-1.5 flex gap-2 overflow-x-auto no-scrollbar border-t border-zinc-900 bg-zinc-950/50">
        {['Draft Architecture Plan', 'Optimize Grid Layout', 'Explain Concept'].map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => setInput(suggestion)}
            className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-full text-[10px] whitespace-nowrap transition-colors"
          >
            ✨ {suggestion}
          </button>
        ))}
      </div>

      {/* Gemini Bottom Input Area */}
      <div className="p-3 bg-zinc-900 border-t border-zinc-800">
        <div className="flex items-center bg-zinc-950 border border-zinc-800 focus-within:border-indigo-500 rounded-xl px-3 py-2 transition-all">
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask Gemini anything..."
            className="flex-1 bg-transparent text-xs text-zinc-200 outline-none placeholder:text-zinc-600"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim()}
            className="ml-2 w-7 h-7 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-lg flex items-center justify-center transition-all"
          >
            <Send size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
