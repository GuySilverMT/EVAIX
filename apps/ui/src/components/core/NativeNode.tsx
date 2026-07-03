import React, { useEffect, useRef } from 'react';

/**
 * @file NativeNode.tsx
 * @description Reparented wrapper for native Linux processes (X11/Wayland).
 * Placeholder for backend IPC/MCP bridge.
 */

export interface NativeNodeProps {
  appName: string;
  windowId?: string; // e.g., X11 window ID or Wayland surface ID
}

export const NativeNode: React.FC<NativeNodeProps> = ({ appName, windowId }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Here we would communicate with the native daemon (via MCP or local IPC)
    // to command the window manager to reparent `windowId` into `containerRef`.
    console.log(`[NativeNode] Requesting reparent for ${appName} (ID: ${windowId})`);
  }, [appName, windowId]);

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center bg-black">
      <span className="text-gray-500 font-mono text-sm">
        [Native Node: {appName}] Waiting for X11 reparent...
      </span>
    </div>
  );
};
