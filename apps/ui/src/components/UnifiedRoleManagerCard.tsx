import React, { useState } from 'react';
import { Bot, Sparkles, Save, SlidersHorizontal, Settings2, Plus } from 'lucide-react';
import { useAgenticContext } from '../hooks/useAgenticContext.js';
// import { trpc } from '@/utils/trpc'; // Assuming you use tRPC for saving

interface RoleDraft {
  id?: string;
  name: string;
  systemPrompt: string;
  model: string;
  tools: string[];
}

export const UnifiedRoleManagerCard = ({ cardId, initialRole = null }) => {
  const [activeRole, setActiveRole] = useState<RoleDraft>(
    initialRole || { name: '', systemPrompt: '', model: 'claude-3.5-sonnet', tools: [] }
  );
  const [architectPrompt, setArchitectPrompt] = useState('');
  const [isArchitectTyping, setIsArchitectTyping] = useState(false);

  // 1. Hook into the Cooperative Shell
  // This allows the Role Manager to be seen by other agents, AND allows 
  // the embedded Role Architect to push mutations directly to this state.
  useAgenticContext({
    id: cardId,
    type: 'role-manager',
    title: activeRole.name || 'New Role',
    defaultIncluded: true,
    
    // PULL: Let the global workspace see what role we are currently editing
    getContext: async () => ({
      format: 'json',
      content: JSON.stringify(activeRole)
    }),
    
    // PUSH: Handle AI-generated mutations to the form
    applyMutation: async (mutation) => {
       if (mutation.action === 'UPDATE_ROLE_DRAFT') {
           setActiveRole(prev => ({ ...prev, ...mutation.payload }));
           return true; // Auto-approves the form update
       }
       return false;
    }
  });

  // 2. The Role Architect Trigger
  const handleArchitectSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!architectPrompt.trim()) return;
     
     setIsArchitectTyping(true);
     
     try {
       // Mocking the call to your backend Role Architect LLM.
       // It reads the user's request and returns a JSON patch for the role.
       // const response = await trpc.roles.invokeArchitect.mutate({ prompt: architectPrompt, currentDraft: activeRole });
       
       console.log("Sending to Architect:", architectPrompt);
       // Simulate network delay
       await new Promise(resolve => setTimeout(resolve, 1500));
       
       // Simulate AI returning a mutated form state
       setActiveRole(prev => ({
         ...prev,
         name: "Postgres Expert",
         systemPrompt: "You are a senior PostgreSQL database administrator. You specialize in query optimization, schema design, and index strategies. Always output verified SQL.",
         tools: ['database-browser', 'terminal']
       }));
     } catch (err) {
       console.error("Architect failed:", err);
     } finally {
       setIsArchitectTyping(false);
       setArchitectPrompt('');
     }
  };

  return (
    <div className="flex flex-col h-full bg-background rounded-xl overflow-hidden shadow-sm border border-border">
       
       {/* =========================================
           1. THE ARCHITECT COPILOT BAR
           ========================================= */}
       <div className="p-4 border-b border-border bg-indigo-500/5">
          <form onSubmit={handleArchitectSubmit} className="flex gap-2 relative">
             <Bot className="absolute left-3 top-2.5 w-5 h-5 text-indigo-500" />
             <input 
               className="w-full bg-background border border-indigo-500/30 rounded-lg pl-10 pr-28 py-2 focus:ring-2 focus:ring-indigo-500 outline-none text-sm shadow-inner"
               placeholder="Ask the Architect to build or update this role... (e.g., 'Make a Python expert')"
               value={architectPrompt}
               onChange={e => setArchitectPrompt(e.target.value)}
             />
             <button 
               type="submit" 
               disabled={isArchitectTyping} 
               className="absolute right-1.5 top-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-colors disabled:opacity-50"
             >
                <Sparkles className="w-3 h-3" />
                {isArchitectTyping ? 'Thinking...' : 'Generate'}
             </button>
          </form>
       </div>

       {/* =========================================
           2. CONDENSED EDITOR BODY (No Tabs)
           ========================================= */}
       <div className="flex-1 overflow-y-auto p-4 space-y-6">
           <div className="space-y-5">
              
              {/* Identity Section */}
              <div className="group">
                 <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 block">Identity</label>
                 <input 
                    className="w-full text-xl font-bold bg-transparent border-b border-transparent hover:border-border focus:border-indigo-500 outline-none pb-1 transition-colors placeholder:text-muted-foreground/50"
                    placeholder="Role Name"
                    value={activeRole.name}
                    onChange={e => setActiveRole({...activeRole, name: e.target.value})}
                 />
                 <textarea 
                    className="w-full mt-4 h-40 bg-muted/20 border border-border rounded-lg p-3 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none leading-relaxed transition-all"
                    placeholder="System Prompt (Define the agent's behavior, rules, and boundaries here...)"
                    value={activeRole.systemPrompt}
                    onChange={e => setActiveRole({...activeRole, systemPrompt: e.target.value})}
                 />
              </div>

              {/* Engine & Tools Grid */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="border border-border rounded-lg p-4 bg-card/50 hover:bg-card transition-colors">
                     <div className="flex items-center gap-2 mb-3 text-sm font-semibold">
                        <Settings2 className="w-4 h-4 text-indigo-400" />
                        Model Engine
                     </div>
                     <select 
                       className="w-full bg-background border border-border rounded-md p-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                       value={activeRole.model}
                       onChange={e => setActiveRole({...activeRole, model: e.target.value})}
                     >
                        <option value="claude-3.5-sonnet">Claude 3.5 Sonnet (Default)</option>
                        <option value="gpt-4o">GPT-4o</option>
                        <option value="llama-3-70b">Llama 3 70B</option>
                     </select>
                  </div>

                  <div className="border border-border rounded-lg p-4 bg-card/50 hover:bg-card transition-colors">
                     <div className="flex items-center gap-2 mb-3 text-sm font-semibold">
                        <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
                        Granted Tools
                     </div>
                     <div className="text-sm space-y-2">
                        {['filesystem', 'terminal', 'database-browser'].map(tool => (
                          <label key={tool} className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="rounded border-border text-indigo-600 focus:ring-indigo-500"
                              checked={activeRole.tools.includes(tool)}
                              onChange={(e) => {
                                const newTools = e.target.checked 
                                  ? [...activeRole.tools, tool]
                                  : activeRole.tools.filter(t => t !== tool);
                                setActiveRole({...activeRole, tools: newTools});
                              }}
                            /> 
                            <span className="capitalize">{tool.replace('-', ' ')}</span>
                          </label>
                        ))}
                     </div>
                  </div>
              </div>
           </div>
       </div>

       {/* =========================================
           3. FOOTER
           ========================================= */}
       <div className="p-4 border-t border-border flex justify-between items-center bg-muted/10">
           <button 
             className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
             onClick={() => setActiveRole({ name: '', systemPrompt: '', model: 'claude-3.5-sonnet', tools: [] })}
           >
              Clear Form
           </button>
           <button className="bg-foreground text-background px-6 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-foreground/90 transition-all shadow-sm">
              <Save className="w-4 h-4" />
              Save to Registry
           </button>
       </div>
    </div>
  )
}
