/**
 * @file PersistentBrowser.tsx
 * @description Electron webview component with event handling
 */

import React, { useEffect } from 'react';
import type { ElectronWebView } from './types';

interface PersistentBrowserProps {
  url: string;
  webviewRef: (node: ElectronWebView | null) => void;
  onReady: (id: string) => void;
  onFail: (id: string, e: any) => void;
  id: string;
  mobileUA: boolean;
  isReaderMode: boolean;
  isElectron: boolean;
}

export function PersistentBrowser({
  url,
  webviewRef,
  onReady,
  onFail,
  id,
  mobileUA,
  isReaderMode,
  isElectron
}: PersistentBrowserProps) {
  useEffect(() => {
    const webview = document.getElementById(`webview-${id}`) as ElectronWebView | null;
    if (!webview) return;

    const handleDomReady = () => onReady(id);
    const handleFail = (e: any) => onFail(id, e);

    webview.addEventListener('dom-ready', handleDomReady);
    webview.addEventListener('did-fail-load', handleFail);

    return () => {
      webview.removeEventListener('dom-ready', handleDomReady);
      webview.removeEventListener('did-fail-load', handleFail);
    };
  }, [id, onReady, onFail]);

  if (!isElectron) return null;

  const WebView = 'webview' as any;

  return (
    <WebView
      id={`webview-${id}`}
      ref={webviewRef}
      src={url}
      style={{
        width: '100%',
        height: '100%',
        visibility: isReaderMode ? 'hidden' : 'visible',
        backgroundColor: 'white'
      }}
      allowpopups="true"
      webpreferences="nativeWindowOpen=yes"
      useragent={mobileUA ? "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1" : undefined}
    />
  );
}
