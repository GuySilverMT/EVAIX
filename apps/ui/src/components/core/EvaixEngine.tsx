import React from 'react';
import { EvaixShell } from './EvaixShell.js';

/**
 * @file EvaixEngine.tsx
 * @description The 3D matrix controller (Display -> Column -> Row) for EVAIX.
 */

export const EvaixEngine: React.FC = () => {
  // In a multi-display environment, the Engine manages which Shells run on which Displays.
  // For now, it orchestrates a single shell.
  
  return (
    <div className="w-full h-full">
      <EvaixShell />
    </div>
  );
};
