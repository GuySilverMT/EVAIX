
import { useParams } from "react-router-dom";
import { NebulaBuilder } from "../features/builder/NebulaBuilder.js"; 
import { useProjectData } from "../../hooks/useProjectData.js"; 

export const BuilderPage = () => {
  const { projectId } = useParams(); 
  const { data, save } = useProjectData(projectId); 

  if (!data) {
      return (
          <div className="h-screen w-screen flex flex-col items-center justify-center bg-zinc-950 text-zinc-500 font-mono text-[10px] uppercase tracking-[0.3em] gap-4">
              <div className="w-12 h-px bg-zinc-800 animate-pulse" />
              Booting Nebula Engine...
              <div className="w-12 h-px bg-zinc-800 animate-pulse" />
          </div>
      );
  }

  // Double check tree exists (hook should handle it, but for safety)
  const initialTree = data.tree;

  return (
    <div className="h-screen w-screen bg-zinc-950 text-white flex overflow-hidden">
      <NebulaBuilder 
        initialTree={initialTree} 
        onSave={(newTree) => { void save(newTree); }} 
      />
    </div>
  );
};
