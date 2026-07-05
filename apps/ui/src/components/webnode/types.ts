/**
 * @file types.ts
 * @description TypeScript types for Electron webview and browser components
 */

export interface Tab {
  id: string;
  url: string;
  title: string;
  isReady: boolean;
}

export interface ElectronWebView extends HTMLElement {
  executeJavaScript: (code: string) => Promise<any>;
  goBack: () => void;
  goForward: () => void;
  reload: () => void;
  getURL: () => string;
  getTitle: () => string;
  stop: () => void;
}

export interface WebViewLoadEvent {
  isTrusted: boolean;
  errorCode: number;
  errorDescription: string;
  validatedURL: string;
  isMainFrame: boolean;
}

export interface BookmarkFolder {
  id: string;
  name: string;
  bookmarks?: Bookmark[];
}

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  folderId: string | null;
}

export interface ParsedCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
}
