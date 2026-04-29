import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, ArrowLeft, type LucideIcon } from 'lucide-react';
import { SuperAiButton } from '../ui/SuperAiButton.js';

interface UniversalCardWrapperProps {
  title: string;
  icon: LucideIcon;
  aiContext?: string;
  settings: React.ReactNode;
  children: React.ReactNode;
  headerEnd?: React.ReactNode; // Optional prop to inject extra controls (like view switcher)
  hideAiButton?: boolean;
}

export const UniversalCardWrapper: React.FC<UniversalCardWrapperProps> = ({
  title,
  icon: Icon,
  aiContext = 'Global',
  settings,
  children,
  headerEnd,
  hideAiButton
}) => {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className="relative w-full h-full perspective-1000 bg-zinc-950 rounded-lg overflow-hidden border border-zinc-800">
      <motion.div
        className="w-full h-full relative preserve-3d"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, type: 'spring', stiffness: 260, damping: 20 }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* FRONT FACE */}
        <div 
          className="absolute inset-0 w-full h-full backface-hidden flex flex-col bg-zinc-950"
          style={{ backfaceVisibility: 'hidden' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 bg-zinc-900/50">
            <div className="flex items-center gap-2 text-zinc-200">
              <Icon size={16} className="text-zinc-400" />
              <span className="font-bold text-sm tracking-wide uppercase">{title}</span>
            </div>
            
            <div className="flex items-center gap-2">
              {headerEnd}
              <div className="h-4 w-px bg-zinc-800 mx-1" />
              {!hideAiButton && <SuperAiButton contextId={aiContext} />}
              <button 
                onClick={() => setIsFlipped(true)}
                className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              >
                <Settings size={16} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 relative overflow-hidden">
            {children}
          </div>
        </div>

        {/* BACK FACE (SETTINGS) */}
        <div 
          className="absolute inset-0 w-full h-full backface-hidden flex flex-col bg-zinc-950"
          style={{ 
            backfaceVisibility: 'hidden', 
            transform: 'rotateY(180deg)' 
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 bg-zinc-900/50">
            <div className="flex items-center gap-2 text-zinc-200">
              <Settings size={16} className="text-zinc-400" />
              <span className="font-bold text-sm tracking-wide uppercase">Configuration</span>
            </div>
            
            <button 
              onClick={() => setIsFlipped(false)}
              className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors text-xs font-medium"
            >
              <span>RETURN</span>
              <ArrowLeft size={14} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-auto p-4 bg-zinc-900/30">
            {settings}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
