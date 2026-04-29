import { 
  Save, Undo, Redo, Monitor, Tablet, Smartphone, Eye, Hand, MousePointer2, LayoutGrid 
} from 'lucide-react';
import { useParams, Link } from 'react-router-dom';
import { useBuilderStore } from '../../../../stores/builder.store.js';
import { cn } from '../../../../lib/utils.js';

export const BuilderToolbar = () => {
  const { projectId } = useParams();
  const { triggerSave, isDirty, viewport, setViewport, interactionMode, setInteractionMode } = useBuilderStore();

  return (
    <div className="flex items-center justify-between w-full animate-in fade-in duration-300">
      
      {/* GROUP 1: Context (What am I editing?) */}
      <div className="flex items-center gap-3 pl-2">
        <Link 
            to="/workbench" 
            className="flex items-center gap-2 px-2 py-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors group"
            title="Go to Agent Workbench"
        >
            <LayoutGrid size={14} className="group-hover:text-indigo-400" />
            <span className="text-[10px] font-black uppercase tracking-tighter">Workbench</span>
        </Link>
        <div className="h-4 w-px bg-zinc-800" />
        <span className="text-zinc-500 text-[10px] font-mono uppercase tracking-widest">
          Construction
        </span>
        <div className="h-4 w-px bg-zinc-800" />
        <span className="text-zinc-100 text-sm font-bold truncate max-w-[150px]">
          {projectId || 'Untitled Project'}
        </span>
        {isDirty && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" title="Unsaved Changes" />}
      </div>

      {/* GROUP 2: The Tools (Center) */}
      <div className="flex items-center gap-1 bg-zinc-950 rounded-lg p-1 border border-zinc-800 shadow-inner">
        <IconButton 
          icon={<MousePointer2 size={14} />} 
          tooltip="Select Mode (V)" 
          active={interactionMode === 'select'} 
          onClick={() => setInteractionMode('select')}
        />
        <IconButton 
          icon={<Hand size={14} />} 
          tooltip="Pan Mode (Space)" 
          active={interactionMode === 'pan'} 
          onClick={() => setInteractionMode('pan')}
        />
        
        <div className="w-px h-4 bg-zinc-800 mx-1" />

        <IconButton 
          icon={<Monitor size={14} />} 
          tooltip="Desktop View" 
          active={viewport === 'desktop'} 
          onClick={() => setViewport('desktop')}
        />
        <IconButton 
          icon={<Tablet size={14} />} 
          tooltip="Tablet View" 
          active={viewport === 'tablet'} 
          onClick={() => setViewport('tablet')}
        />
        <IconButton 
          icon={<Smartphone size={14} />} 
          tooltip="Mobile View" 
          active={viewport === 'mobile'} 
          onClick={() => setViewport('mobile')}
        />
        <div className="w-px h-4 bg-zinc-800 mx-1" />
        <IconButton icon={<Undo size={14} />} tooltip="Undo" />
        <IconButton icon={<Redo size={14} />} tooltip="Redo" />
      </div>

      {/* GROUP 3: Actions (Right) */}
      <div className="flex items-center gap-2">
        <button className="text-neutral-400 hover:text-white px-3 py-1.5 text-xs font-medium border border-transparent hover:border-neutral-700 rounded-lg transition-colors flex items-center gap-2">
           <Eye size={14} /> Preview
        </button>
        <button 
          onClick={triggerSave}
          disabled={!isDirty}
          className={cn(
            "px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-lg",
            isDirty 
              ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20" 
              : "bg-neutral-800 text-neutral-500 cursor-not-allowed opacity-50"
          )}
        >
          <Save size={14} /> {isDirty ? 'SAVE CHANGES' : 'SAVED'}
        </button>
      </div>
    </div>
  );
};

// Helper for clean buttons
const IconButton = ({ icon, active, tooltip, onClick }: { icon: React.ReactNode, active?: boolean, tooltip?: string, onClick?: () => void }) => (
  <button 
    title={tooltip}
    onClick={onClick}
    className={cn(
      "p-1.5 rounded-md transition-all",
      active 
        ? "bg-neutral-800 text-indigo-400 shadow-sm ring-1 ring-neutral-700" 
        : "text-neutral-500 hover:text-white hover:bg-neutral-800"
    )}
  >
    {icon}
  </button>
);
