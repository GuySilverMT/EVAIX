import React from 'react';
import { WebNode } from '../components/WebNode.js';
import { EvaixCalendar } from '../components/core/EvaixCalendar.js';
import { MastraNode } from '../components/core/MastraNode.js';

/**
 * @file ComponentRegistry.ts
 * @description Master Component Registry for EVAIX Agentic Spatial Window Manager.
 * Maps app IDs to AppDefinitions containing components and their injected props.
 */

export interface AppDefinition {
  component: React.ComponentType<any>;
  props: Record<string, any>;
  showBrowserBar: boolean;
}

export const AppRegistry: Record<string, AppDefinition> = {
  'litellm-ui': { component: WebNode, props: { initialUrl: 'http://localhost:8080/ui' }, showBrowserBar: false },
  'browser': { component: WebNode, props: { initialUrl: 'https://duckduckgo.com' }, showBrowserBar: true },
  'openwebui': { component: WebNode, props: { initialUrl: 'http://localhost:3000' }, showBrowserBar: false },
  'terminal': { component: WebNode, props: { initialUrl: 'http://localhost:7681' }, showBrowserBar: false },
  'file-explorer': { component: WebNode, props: { initialUrl: 'http://localhost:8082' }, showBrowserBar: false },
  'scheduler':      { component: EvaixCalendar, props: {}, showBrowserBar: false },
  'mastra-ui':      { component: MastraNode, props: {}, showBrowserBar: false },
};

export const getRegisteredApp = (appId: string | null | undefined): AppDefinition | null => {
  if (!appId) return null;
  return AppRegistry[appId.toLowerCase()] || null;
};
