import React from 'react';
import { ProjectNavigator } from '../components/work-order/ProjectNavigator.js';
import { WebNode } from '../components/WebNode.js';
import { NativeNode } from '../components/core/NativeNode.js';
import { LiteLLMConfig } from '../components/core/LiteLLMConfig.js';
import { AIChat } from '../components/AIChat.js';

/**
 * @file ComponentRegistry.ts
 * @description Master Component Registry for EVAIX Agentic Spatial Window Manager.
 * Maps app IDs directly to React payload components. 
 */
export const ComponentRegistry: Record<string, React.ComponentType<any>> = {
  // --- Core Native Components ---
  'project-navigator': ProjectNavigator,
  'filesystem': ProjectNavigator,    // Alias for agent intent routing
  'lite-llm-config': LiteLLMConfig,  // Custom native React config overlay
  'ai-chat': AIChat,                 // Command chat input for Role Architect


  // --- Core Wrappers ---
  'webnode': WebNode,
  'nativenode': NativeNode,

  // --- Orchestrated Third-Party Interfaces ---
  // These utilize the wrappers to embed external processes seamlessly
  'browser': WebNode,        // Supply a generic URL via props
  'openwebui': WebNode,      // e.g., props: { url: 'http://localhost:8080' }
  'litellm-ui': WebNode,     // e.g., props: { url: 'http://localhost:4000/ui' }
  
  // --- Native Processes ---
  'terminal': NativeNode,    // Hooks into standard Linux terminal emulators (e.g., Alacritty, GNOME Terminal)
};

export const APP_REGISTRY = ComponentRegistry;
export const COMPONENT_REGISTRY = ComponentRegistry;

export const getRegisteredComponent = (appId: string | null | undefined): React.ComponentType<any> | null => {
  if (!appId) return null;
  return ComponentRegistry[appId.toLowerCase()] || null;
};
