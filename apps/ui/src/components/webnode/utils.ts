/**
 * @file utils.ts
 * @description Utility functions for webnode components
 */

import type { WebViewLoadEvent } from './types';

export function isElectron(): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof window.process === 'object' && (window.process as any).versions?.electron) {
    return true;
  }
  if (window.navigator.userAgent.toLowerCase().includes('electron')) {
    return true;
  }
  return false;
}

export function getLoadErrorMessage(event: WebViewLoadEvent, fallbackUrl: string): string {
  const validatedUrl = event?.validatedURL || fallbackUrl;
  let errorDescription = event?.errorDescription || 'The page could not be loaded.';

  // Handle ERR_ABORTED separately as it's often not a critical error
  if (event?.errorCode === -3) {
    return ''; // Don't show error for aborted navigations
  }

  // Provide more specific feedback for common Electron webview errors
  if (event?.errorCode === -101) { // ERR_CONNECTION_RESET
    try {
      const urlObj = new URL(validatedUrl);
      errorDescription = `Connection reset. Is the server at ${urlObj.origin} running and accepting connections?`;
    } catch {
      errorDescription = `Connection reset. Is the server running and accepting connections? (URL: ${validatedUrl})`;
    }
  } else if (event?.errorCode === -102) { // ERR_CONNECTION_REFUSED
    try {
      const urlObj = new URL(validatedUrl);
      errorDescription = `Connection refused. Is the server at ${urlObj.origin} running and accessible?`;
    } catch {
      errorDescription = `Connection refused. Is the server running and accessible? (URL: ${validatedUrl})`;
    }
  } else if (event?.errorCode === -105) { // ERR_NAME_NOT_RESOLVED
    errorDescription = 'Cannot resolve server hostname. Check your internet connection or the URL.';
  }

  return errorDescription;
}

export function parseCookies(cookieStr: string, currentUrl: string): Array<{ name: string; value: string; domain: string; path: string }> {
  if (!cookieStr) return [];
  
  return cookieStr.split('; ').map((c: string) => {
    const [name, ...rest] = c.split('=');
    return {
      name,
      value: rest.join('='),
      domain: new URL(currentUrl).hostname,
      path: '/'
    };
  });
}
