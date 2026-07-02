import React from 'react';

interface AgentWorkbenchScaffoldProps {
  header?: React.ReactNode;
  content?: React.ReactNode;
}

export const AgentWorkbenchScaffold = ({
  header,
  content,
}: AgentWorkbenchScaffoldProps) => (
  <div className="flex flex-col h-screen w-screen overflow-hidden bg-zinc-950">
    {header && <div className="h-16 border-b border-zinc-800 shrink-0">{header}</div>}
    <main className="flex-1 overflow-hidden relative">{content}</main>
  </div>
);
