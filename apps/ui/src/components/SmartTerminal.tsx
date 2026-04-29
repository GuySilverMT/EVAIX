import { useRef, useState } from 'react';
import { SmartContainer } from './nebula/containers/SmartContainer.js';
import XtermTerminal from './XtermTerminal.js';
import { Play, Copy, Check } from 'lucide-react';
import type { TerminalMessage } from '@repo/common/agent';
import type { Terminal } from 'xterm';

// Extended Terminal interface with custom methods
interface ExtendedTerminal extends Terminal {
  getBufferLog?: () => string;
}

interface SmartTerminalProps {
  logs?: TerminalMessage[];
  workingDirectory?: string;
  onInput?: (input: string) => void;
}

export const SmartTerminal = ({ logs = [], workingDirectory, onInput = () => {} }: SmartTerminalProps) => {
  const termRef = useRef<ExtendedTerminal | null>(null); // Access to xterm instance
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const term = termRef.current;
    if (term?.getBufferLog) {
        const log = term.getBufferLog();
        void navigator.clipboard.writeText(log).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }
  };

  return (
    <SmartContainer 
      type="TERMINAL" 
      title="System Logs"
      extraActions={
        <div className="flex items-center gap-2 text-zinc-400">
            <button 
                type="button" 
                onClick={handleCopy}
                className="hover:text-zinc-100 transition-colors flex items-center gap-1.5" 
                title="Copy Terminal Logs"
            >
                {copied ? <Check size={10} className="text-green-500" /> : <Copy size={10}/>}
                <span className="text-[9px] font-bold uppercase">{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <div className="w-px h-3 bg-zinc-800" />
            <button type="button" title="Run Selection" className="hover:text-zinc-100 transition-colors"><Play size={10}/></button>
        </div>
      }
    >
      {(registerContext) => (
        <XtermTerminal 
          logs={logs}
          workingDirectory={workingDirectory}
          onInput={onInput}
          hideWrapper
          onMount={(term: Terminal) => {
             termRef.current = term as ExtendedTerminal;
             registerContext(() => {
                 const xterm = term as ExtendedTerminal;
                 const log = xterm.getBufferLog?.() ?? "Terminal not ready"; 
                 return log;
             });
          }}
        />
      )}
    </SmartContainer>
  );
};
