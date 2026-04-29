import React from 'react';

export const CooperativeCard = ({ children, title }: { children: React.ReactNode, title?: string }) => {
  return (
    <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg shadow-sm">
      {title && <h3 className="text-lg font-bold text-white mb-2">{title}</h3>}
      <div className="text-zinc-300">
        {children}
      </div>
    </div>
  );
};
