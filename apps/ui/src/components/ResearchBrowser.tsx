import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, Home, Loader2, X, ZoomIn, ZoomOut } from 'lucide-react';
import { trpc } from '../utils/trpc.js';

export default function ResearchBrowser({ cardId, screenspaceId, initialUrl = 'https://google.com' }: { cardId?: string; screenspaceId?: number; initialUrl?: string }) {
  const [url, setUrl] = useState(initialUrl);
  const [currentUrl, setCurrentUrl] = useState(initialUrl);
  const [title, setTitle] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Rule: each cardId is the sessionId, but we prefix with screenspace purpose
  const sessionIdentityId = screenspaceId === 1 ? 'session-google' : 'session-github';
  const sessionId = `${sessionIdentityId}-${cardId || `browser-${Date.now()}`}`;
  const [zoom, setZoom] = useState(1.0);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [keyboardInput, setKeyboardInput] = useState('');
  const imageRef = useRef<HTMLImageElement>(null);

  const navigateMutation = trpc.browser.navigate.useMutation();
  const clickMutation = trpc.browser.click.useMutation();
  const scrollMutation = trpc.browser.scroll.useMutation();
  const goBackMutation = trpc.browser.goBack.useMutation();
  const goForwardMutation = trpc.browser.goForward.useMutation();
  const closeSessionMutation = trpc.browser.closeSession.useMutation();
  const typeMutation = trpc.browser.type.useMutation();
  const pressKeyMutation = trpc.browser.pressKey.useMutation();

  const handleNavigate = useCallback(async () => {
    if (!url) return;
    
    // Process the URL like a real browser would
    let processedUrl = url.trim();
    
    // If it looks like a search query (no dots or spaces), use Google
    if (!processedUrl.includes('.') || processedUrl.includes(' ')) {
      processedUrl = `https://www.google.com/search?q=${encodeURIComponent(processedUrl)}`;
    } 
    // If it looks like a domain but missing protocol, add https://
    else if (!processedUrl.startsWith('http://') && !processedUrl.startsWith('https://')) {
      processedUrl = `https://${processedUrl}`;
    }
    
    setIsLoading(true);
    try {
      const result = await navigateMutation.mutateAsync({ sessionId, url: processedUrl });
      setScreenshot(result.screenshot);
      setTitle(result.title);
      setCurrentUrl(result.url);
      setUrl(result.url);
    } catch (error) {
      console.error('Navigation failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [url, sessionId, navigateMutation]);

  const handleClick = useCallback(async (e: React.MouseEvent<HTMLImageElement>) => {
    if (!imageRef.current) return;
    
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 1280 / zoom;
    const y = ((e.clientY - rect.top) / rect.height) * 720 / zoom;

    setIsLoading(true);
    try {
      const result = await clickMutation.mutateAsync({ 
        sessionId, 
        x: Math.round(x), 
        y: Math.round(y) 
      });
      setScreenshot(result.screenshot);
      setTitle(result.title);
      setCurrentUrl(result.url);
      setUrl(result.url);
      
      // Show keyboard input panel for typing
      setShowKeyboard(true);
      setKeyboardInput('');
    } catch (error) {
      console.error('Click failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, clickMutation, zoom]);

  const handleKeyboardSubmit = useCallback(async () => {
    if (!keyboardInput.trim()) return;
    
    try {
      const result = await typeMutation.mutateAsync({ 
        sessionId, 
        text: keyboardInput 
      });
      setScreenshot(result.screenshot);
      setKeyboardInput('');
    } catch (error) {
      console.error('Type failed:', error);
    }
  }, [sessionId, keyboardInput, typeMutation]);

  const handleKeyPress = useCallback(async (key: string) => {
    try {
      const result = await pressKeyMutation.mutateAsync({ sessionId, key });
      setScreenshot(result.screenshot);
    } catch (error) {
      console.error('Key press failed:', error);
    }
  }, [sessionId, pressKeyMutation]);

  const handleScroll = useCallback(async (e: React.WheelEvent) => {
    e.preventDefault();
    
    const deltaY = e.deltaY;
    
    try {
      const result = await scrollMutation.mutateAsync({ sessionId, deltaY });
      setScreenshot(result.screenshot);
    } catch (error) {
      console.error('Scroll failed:', error);
    }
  }, [sessionId, scrollMutation]);

  const handleBack = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await goBackMutation.mutateAsync({ sessionId });
      setScreenshot(result.screenshot);
      setTitle(result.title);
      setCurrentUrl(result.url);
      setUrl(result.url);
    } catch (error) {
      console.error('Go back failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, goBackMutation]);

  const handleForward = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await goForwardMutation.mutateAsync({ sessionId });
      setScreenshot(result.screenshot);
      setTitle(result.title);
      setCurrentUrl(result.url);
      setUrl(result.url);
    } catch (error) {
      console.error('Go forward failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, goForwardMutation]);

  const handleRefresh = useCallback(() => {
    void handleNavigate();
  }, [handleNavigate]);

  const handleHome = useCallback(() => {
    setUrl('https://google.com');
    setTimeout(() => {
      navigateMutation.mutate({ sessionId, url: 'https://google.com' }, {
        onSuccess: (result) => {
          setScreenshot(result.screenshot);
          setTitle(result.title);
          setCurrentUrl(result.url);
        }
      });
    }, 0);
  }, [sessionId, navigateMutation]);

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 0.25, 3.0));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoom(1.0);
  }, []);

  useEffect(() => {
    if (initialUrl) {
      void handleNavigate();
    }
    return () => {
      void closeSessionMutation.mutateAsync({ sessionId });
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcut: Ctrl+K to toggle keyboard panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        setShowKeyboard(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex flex-col h-full w-full bg-zinc-900">
      
      {/* Browser Bar */}
      <div className="h-10 flex items-center gap-2 px-2 bg-zinc-950 border-b border-zinc-800">
        <button 
          className="p-1.5 hover:bg-zinc-800 rounded text-[var(--color-text-secondary)] hover:text-white disabled:opacity-30"
          onClick={() => void handleBack()}
          disabled={isLoading}
          title="Back"
        >
          <ArrowLeft size={14}/>
        </button>
        <button 
          className="p-1.5 hover:bg-zinc-800 rounded text-[var(--color-text-secondary)] hover:text-white disabled:opacity-30"
          onClick={() => void handleForward()}
          disabled={isLoading}
          title="Forward"
        >
          <ArrowRight size={14}/>
        </button>
        <button 
          className="p-1.5 hover:bg-zinc-800 rounded text-[var(--color-text-secondary)] hover:text-white disabled:opacity-30"
          onClick={() => void handleRefresh()}
          disabled={isLoading}
          title="Refresh"
        >
          {isLoading ? <Loader2 size={14} className="animate-spin" /> : <RotateCw size={14}/>}
        </button>
        <button 
          className="p-1.5 hover:bg-zinc-800 rounded text-[var(--color-text-secondary)] hover:text-white disabled:opacity-30"
          onClick={() => void handleHome()}
          disabled={isLoading}
          title="Home"
        >
          <Home size={14}/>
        </button>
        
        {/* URL Input */}
        <div className="flex-1 relative">
          <input 
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-1 text-xs text-zinc-300 focus:border-cyan-500 focus:outline-none"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                void handleNavigate();
              }
            }}
            placeholder="Search or enter URL..."
            disabled={isLoading}
          />
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 bg-zinc-900 rounded p-0.5 border border-zinc-800">
          <button
            onClick={handleZoomOut}
            className="p-1 hover:bg-zinc-800 rounded text-[var(--color-text-secondary)] hover:text-white"
            title="Zoom Out (50%-300%)"
          >
            <ZoomOut size={14} />
          </button>
          <button
            onClick={handleZoomReset}
            className="px-2 py-0.5 hover:bg-zinc-800 rounded text-[10px] text-[var(--color-text-secondary)] hover:text-white font-mono"
            title="Reset Zoom"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            onClick={handleZoomIn}
            className="p-1 hover:bg-zinc-800 rounded text-[var(--color-text-secondary)] hover:text-white"
            title="Zoom In (50%-300%)"
          >
            <ZoomIn size={14} />
          </button>
        </div>

        {title && (
          <div className="text-xs text-[var(--color-text-secondary)] max-w-xs truncate">
            {title}
          </div>
        )}
      </div>

      {/* Viewport */}
      <div className="flex-1 overflow-auto bg-zinc-950 p-2">
        {screenshot ? (
          <div 
            className="relative inline-block border border-zinc-800 shadow-2xl" 
            onWheel={(e) => void handleScroll(e)}
            style={{
              minWidth: `${1280 * zoom}px`,
              minHeight: `${720 * zoom}px`
            }}
          >
            {isLoading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                <Loader2 className="animate-spin text-cyan-400" size={32} />
              </div>
            )}
            <img
              ref={imageRef}
              src={screenshot}
              alt="Browser content"
              className="cursor-pointer block"
              onClick={(e) => void handleClick(e)}
              style={{ 
                width: '1280px',
                height: '720px',
                transform: `scale(${zoom})`,
                transformOrigin: 'top left'
              }}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-secondary)] gap-4">
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" size={48} />
                <p>Loading browser...</p>
              </>
            ) : (
              <>
                <X size={48} className="opacity-20" />
                <p>Enter a URL to start browsing</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Keyboard Input Panel */}
      {showKeyboard && (
        <div className="h-12 bg-zinc-900 border-t border-zinc-700 px-3 flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2">
            <input
              autoFocus
              type="text"
              value={keyboardInput}
              onChange={(e) => setKeyboardInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleKeyboardSubmit();
                  void handleKeyPress('Enter');
                } else if (e.key === 'Tab') {
                  e.preventDefault();
                  void handleKeyPress('Tab');
                }
              }}
              placeholder="Type text here (Ctrl+K to toggle, Enter to submit)"
              className="flex-1 bg-zinc-950 border border-zinc-700 rounded px-3 py-1.5 text-xs text-zinc-300 focus:border-cyan-500 focus:outline-none"
            />
            <button
              onClick={() => void handleKeyboardSubmit()}
              className="px-3 py-1.5 bg-cyan-900/30 border border-cyan-700 text-cyan-400 hover:bg-cyan-900/50 rounded text-xs font-bold"
              title="Send text"
            >
              Send
            </button>
            <button
              onClick={() => void handleKeyPress('Enter')}
              className="px-2 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-[var(--color-text-secondary)] rounded text-xs"
              title="Press Enter"
            >
              ↵
            </button>
            <button
              onClick={() => void handleKeyPress('Tab')}
              className="px-2 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-[var(--color-text-secondary)] rounded text-xs"
              title="Press Tab"
            >
              Tab
            </button>
            <button
              onClick={() => setShowKeyboard(false)}
              className="px-2 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-[var(--color-text-secondary)] rounded text-xs"
              title="Close keyboard"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Status Bar */}
      <div className="h-6 bg-zinc-950 border-t border-zinc-800 px-3 flex items-center text-[10px] text-zinc-600">
        <span>Session: {sessionId.substring(0, 12)}...</span>
        <span className="mx-2">|</span>
        <span>{currentUrl || 'No page loaded'}</span>
        <span className="mx-2">|</span>
        <span>Zoom: {Math.round(zoom * 100)}%</span>
      </div>
    </div>
  );
}
