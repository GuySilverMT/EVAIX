/**
 * Org Control Workflow — Phase 4
 *
 * 2-column layout:
 *   Left:  DbNodeCanvas (infinite canvas for org roles) with right-click context menu
 *   Right: Role Creator / Editor (AgentDNAlab) in a UniversalCardWrapper
 */
import { Users, Fingerprint } from 'lucide-react';
import { UniversalCardWrapper } from '../../components/work-order/UniversalCardWrapper.js';
import { DbNodeCanvas } from '../../components/DbNodeCanvas.js';
import { UnifiedRoleManagerCard } from '../../components/UnifiedRoleManagerCard.js';

export default function OrgWorkflow() {
  return (
    <div className="h-full w-full flex overflow-hidden bg-zinc-950">

      {/* LEFT: Infinite org canvas */}
      <div className="flex-1 flex flex-col overflow-hidden border-r border-zinc-800">
        <UniversalCardWrapper
          title="Org Canvas"
          icon={Users}
          aiContext="org_canvas"
          settings={
            <div className="text-xs text-zinc-400 space-y-2">
              <p>Right-click anywhere on the canvas to add a new role node.</p>
              <p>Drag nodes to reposition. Use the SuperAiButton on a node to auto-configure it.</p>
            </div>
          }
        >
          <DbNodeCanvas orgMode />
        </UniversalCardWrapper>
      </div>

      {/* RIGHT: Role Creator/Editor */}
      <div className="flex-1 min-w-[25vw] flex flex-col overflow-hidden">
        <UniversalCardWrapper
          title="Role Creator"
          icon={Fingerprint}
          aiContext="role_creator"
          settings={
            <div className="text-xs text-zinc-400 space-y-2">
              <p>Create and edit roles. Changes are reflected live on the canvas.</p>
            </div>
          }
        >
          <UnifiedRoleManagerCard cardId="role-creator" />
        </UniversalCardWrapper>
      </div>

    </div>
  );
}
