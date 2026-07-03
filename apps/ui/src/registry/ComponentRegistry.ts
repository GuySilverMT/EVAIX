import React from 'react';
import { ProjectNavigator } from '../components/work-order/ProjectNavigator.js';
import { WebNode } from '../components/WebNode.js';
import { NativeNode } from '../components/core/NativeNode.js';
import { LiteLLMConfig } from '../components/core/LiteLLMConfig.js';

/**
 * @file ComponentRegistry.ts
 * @description Master Component Registry for EVAIX Agentic Spatial Window Manager.
 * Maps app IDs directly to React payload components. Under the "Orchestrator Paradigm",
 * this primarily wraps URLs via WebNode or X11 windows via NativeNode.
 */
export const ComponentRegistry: Record<string, React.ComponentType<any>> = {
  'project-navigator': ProjectNavigator,
  'webnode': WebNode,
  'nativenode': NativeNode,
  'lite-llm-config': LiteLLMConfig,
};

export const APP_REGISTRY = ComponentRegistry;
export const COMPONENT_REGISTRY = ComponentRegistry;

export const getRegisteredComponent = (appId: string | null | undefined): React.ComponentType<any> | null => {
  if (!appId) return null;
  return ComponentRegistry[appId.toLowerCase()] || null;
};
