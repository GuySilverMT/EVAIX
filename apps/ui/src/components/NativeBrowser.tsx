import React, { useRef, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, AlertTriangle } from 'lucide-react';
import { Button } from './ui/button.js';

interface NativeBrowserProps {
  url: string;
}

export const NativeBrowser: React.FC<NativeBrowserProps> = ({ url }) => {
  const [isElectron, setIsElectron] = useState(false);
  interface WebviewTag extends HTMLElement {
    canGoBack(): boolean;
    goBack(): void;
    canGoForward(): boolean;
    goForward(): void;
    reload(): void;
    src: string;
  }
  const webviewRef = useRef<WebviewTag>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Check for Electron
    // @ts-ignore process is injected by Electron
    if (window.process?.type === 'renderer') {
      setIsElectron(true);
    } else {
        // Fallback or secondary check
       const userAgent = window.navigator.userAgent.toLowerCase();
       if (userAgent.includes('electron')) {
         setIsElectron(true);
       }
    }
  }, []);

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const handleDomReady = () => setIsReady(true);
    const handleFail = (e: any) => {
        console.warn('NativeBrowser failed load:', e);
        // We don't have toast here, so we'll just log and maybe add a UI indicator later
    };

    webview.addEventListener('dom-ready', handleDomReady);
    webview.addEventListener('did-fail-load', handleFail);
    
    return () => {
      webview.removeEventListener('dom-ready', handleDomReady);
      webview.removeEventListener('did-fail-load', handleFail);
    };
  }, [isElectron]);

  const handleGoBack = () => {
    if (isElectron && webviewRef.current && isReady) {
      if (webviewRef.current.canGoBack()) {
        webviewRef.current.goBack();
      }
    } else if (iframeRef.current) {
        // iframe history manipulation is limited due to cross-origin
        console.warn("Back navigation not fully supported in iframe mode");
    }
  };

  const handleGoForward = () => {
    if (isElectron && webviewRef.current && isReady) {
      if (webviewRef.current.canGoForward()) {
        webviewRef.current.goForward();
      }
    }
  };

  const handleReload = () => {
    if (isElectron && webviewRef.current && isReady) {
      webviewRef.current.reload();
    } else if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  const [browserUrl, setBrowserUrl] = useState(url);
  const [inputUrl, setInputUrl] = useState(url);
  
  // Update internal state if the prop changes from outside
  useEffect(() => {
    setBrowserUrl(url);
    setInputUrl(url);
  }, [url]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      let target = inputUrl.trim();
      if (!target) return;

      const isUrl = !target.includes(' ') && (target.includes('.') || target.startsWith('localhost') || target.startsWith('http'));

      if (isUrl) {
        if (!target.startsWith('http')) {
          target = `https://${target}`;
        }
      } else {
        target = `https://www.google.com/search?q=${encodeURIComponent(target)}`;
      }

      setBrowserUrl(target);
      setInputUrl(target);
    }
  };

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const handleNavigate = (e: any) => {
      setBrowserUrl(e.url);
      setInputUrl(e.url);
    };

    webview.addEventListener('did-navigate', handleNavigate);
    webview.addEventListener('did-navigate-in-page', handleNavigate);
    
    return () => {
      webview.removeEventListener('did-navigate', handleNavigate);
      webview.removeEventListener('did-navigate-in-page', handleNavigate);
    };
  }, [isReady]);

  return (
    <div className="flex flex-col w-full h-full bg-zinc-900 overflow-hidden rounded-md border border-zinc-800">
      {/* Browser Toolbar */}
      <div className="h-10 bg-zinc-950 flex items-center px-2 space-x-2 border-b border-zinc-800">
        <Button variant="ghost" size="icon" onClick={handleGoBack} disabled={isElectron && !isReady} className="h-8 w-8 text-zinc-400 hover:text-emerald-400 disabled:opacity-30">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={handleGoForward} disabled={isElectron && !isReady} className="h-8 w-8 text-zinc-400 hover:text-emerald-400 disabled:opacity-30">
          <ArrowRight className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={handleReload} disabled={isElectron && !isReady} className="h-8 w-8 text-zinc-400 hover:text-emerald-400 disabled:opacity-30">
          <RotateCw className="w-4 h-4" />
        </Button>
        
        <div className="flex-1">
          <input 
            className="w-full bg-zinc-900 rounded px-3 py-1 text-xs text-zinc-300 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 border border-transparent focus:border-emerald-500/50 transition-all"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={(e) => e.target.select()}
          />
        </div>
      </div>

      {/* Browser Content */}
      <div className="flex-1 min-h-0 relative bg-black">
        {isElectron ? (
          <>
            {/* eslint-disable-next-line react/no-unknown-property */}
            <webview
              ref={webviewRef}
              src={browserUrl}
              className="w-full h-full"
              style={{ backgroundColor: '#000' }}
              // eslint-disable-next-line react/no-unknown-property
              allowpopups
              // eslint-disable-next-line react/no-unknown-property
              webpreferences="nativeWindowOpen=yes"
            />
          </>
        ) : (
          <div className="w-full h-full relative">
            <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="bg-zinc-900 border border-yellow-500/50 p-4 rounded-lg shadow-xl text-center max-w-md">
                    <AlertTriangle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                    <h3 className="text-lg font-bold text-white mb-1">Web Mode Restricted</h3>
                    <p className="text-zinc-400 text-sm">
                        You are viewing this purely in the browser. <br/>
                        For the full experience with native window management, run the Desktop app.
                    </p>
                </div>
            </div>
            <iframe
              ref={iframeRef}
              src={browserUrl}
              className="w-full h-full border-none bg-white"
              title="Web Preview"
              sandbox="allow-same-origin allow-scripts allow-forms"
            />
          </div>
        )}
      </div>
    </div>
  );
};
