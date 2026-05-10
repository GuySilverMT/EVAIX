import React from 'react';
import { Users, Fingerprint } from 'lucide-react';
import { UniversalCardWrapper } from '../../components/work-order/UniversalCardWrapper.js';
import { DbNodeCanvas } from '../../components/DbNodeCanvas.js';
// 1. Import the new Unified Role Manager we built
import { UnifiedRoleManagerCard } from '../../components/UnifiedRoleManagerCard.js';

export const OrgWorkflow = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
      {/* LEFT COLUMN: Infinite Canvas for Org Visualization */}
      <div className="h-[calc(100vh-8rem)] min-h-[600px] border border-border rounded-xl overflow-hidden bg-muted/10 relative">
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 bg-background/80 backdrop-blur border border-border rounded-lg shadow-sm">
          <Users className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-semibold">Organization Graph</span>
        </div>
        <DbNodeCanvas />
      </div>

      {/* RIGHT COLUMN: The Unified Role Manager (with Built-in Architect) */}
      <div className="h-full flex flex-col gap-4">
        <UniversalCardWrapper 
          id="role-creator"
          title="Role Creator"
          icon={Fingerprint}
          aiContext="role_creator"
          settings={
            <div className="text-xs text-zinc-400 space-y-2">
              <p>Create and edit roles. Changes are reflected live on the canvas.</p>
            </div>
          }
        >
          {/* 2. Mount the new Copilot interface instead of AgentDNAlab */}
          <div className="h-[calc(100vh-12rem)] min-h-[600px]">
            <UnifiedRoleManagerCard cardId="role-creator" />
          </div>
        </UniversalCardWrapper>
      </div>
    </div>
  );
};

export default OrgWorkflow;
