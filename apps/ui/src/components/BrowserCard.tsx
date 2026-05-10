import React, { useRef, useState, useEffect, useCallback } from 'react';
import { UniversalCardWrapper } from './work-order/UniversalCardWrapper.js';
import ResearchBrowser from './ResearchBrowser.js';
import { 
  Globe, ArrowLeft, ArrowRight, RotateCw, Lock, 
  Star, Crosshair, ChevronDown, ExternalLink, Folder
} from 'lucide-react';
import { trpc } from '../utils/trpc.js';
import { toast } from 'sonner';
import { cn } from '../lib/utils.js';
import { useWorkspaceStore } from '../stores/workspace.store.js';
import { SuperAiButton } from './ui/SuperAiButton.js';
import { parseOmniboxInput } from '../utils/browser.utils.js';
import { Plus, X as CloseIcon } from 'lucide-react';

/**
 * Persistent WebView Component
 * Memoized to prevent re-renders when parent layout changes.
 * In a real Portal strategy, this would render to a detached DOM node.
 */
const PersistentBrowser = React.memo(({ 
  url,
  webviewRef, 
  onReady, 
  onFail, 
  id,
  mobileUA, 
  isReaderMode,
  isElectron 
}: {
  url: string;
  webviewRef: (node: HTMLWebViewElement | null) => void;
  onReady: (id: string) => void;
  onFail: (id: string, e: any) => void;
  id: string;
  mobileUA: boolean;
  isReaderMode: boolean;
  isElectron: boolean;
}) => {
  useEffect(() => {
    const webview = document.getElementById(`webview-${id}`) as any;
    if (!webview) return;

    const handleDomReady = () => onReady(id);
    const handleFail = (e: any) => onFail(id, e);

    webview.addEventListener('dom-ready', handleDomReady);
    // @ts-ignore Electron event
    webview.addEventListener('did-fail-load', handleFail);
    
    return () => {
      webview.removeEventListener('dom-ready', handleDomReady);
      // @ts-ignore Electron event
      webview.removeEventListener('did-fail-load', handleFail);
    };
  }, [webviewRef, onReady, onFail]);

  if (!isElectron) return null;

  // Use string for webview tag
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
});

PersistentBrowser.displayName = 'PersistentBrowser';

const isElectron = () => {
  if (typeof window === 'undefined') return false;
  if (typeof window.process === 'object' && (window.process as any).versions?.electron) return true;
  if (window.navigator.userAgent.toLowerCase().includes('electron')) return true;
  return false;
};

interface BrowserCardProps {
  id?: string;
  cardId?: string;
  screenspaceId?: number;
  headerEnd?: React.ReactNode;
  initialUrl?: string;
  onLoad?: (content: string) => void;
  hideWrapper?: boolean;
  billingModeProviderId?: string;
  onBillingSessionSaved?: () => void;
}

export const BrowserCard: React.FC<BrowserCardProps> = ({
  id = "browser-default",
  cardId, 
  screenspaceId, 
  headerEnd, 
  initialUrl = 'https://www.google.com', 
  onLoad, 
  hideWrapper, 
  billingModeProviderId, 
  onBillingSessionSaved 
}) => {
  const [activeTabId, setActiveTabId] = useState<string>('default');
  const [tabs, setTabs] = useState<Array<{ id: string; url: string; title: string; isReady: boolean }>>([
    { id: 'default', url: initialUrl, title: 'New Tab', isReady: false }
  ]);
  const [input, setInput] = useState(initialUrl);
  const [isSelectingDOM, setIsSelectingDOM] = useState(false);
  
  // Ref map for multiple webviews
  const webviewRefs = useRef<Map<string, HTMLWebViewElement>>(new Map());
  
  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];
  const url = activeTab.url;
  const isReady = activeTab.isReady;
  
  // Stores
  const appendContextBuffer = useWorkspaceStore(state => state.appendContextBuffer);
  
  // Reader Mode State
  const [isReaderMode, setIsReaderMode] = useState(false);
  const [readerContent, setReaderContent] = useState<string>('');

  // tRPC
  const utils = trpc.useContext();
  const extractMutation = trpc.browser.extractMarkdown.useMutation();
  const { data: folders } = trpc.bookmark.listFolders.useQuery();
  // Bookmark Popover State
  const [showBookmarkPopover, setShowBookmarkPopover] = useState(false);
  const [bookmarkTitle, setBookmarkTitle] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const createBookmarkMutation = trpc.bookmark.createBookmark.useMutation({
    onSuccess: () => {
      toast.success("Bookmark added!");
      setShowBookmarkPopover(false);
      setIsCreatingFolder(false);
      setNewFolderName('');
      void utils.bookmark.listFolders.invalidate();
    }
  });

  const createFolderMutation = trpc.bookmark.createFolder.useMutation({
    onSuccess: () => {
      toast.success("Folder created!");
      setIsCreatingFolder(false);
      setNewFolderName('');
      void utils.bookmark.listFolders.invalidate();
    }
  });

  const saveBillingSessionMutation = trpc.providers.saveBillingSession.useMutation({
    onSuccess: () => {
      toast.success('Billing session saved successfully!');
      if (onBillingSessionSaved) onBillingSessionSaved();
    },
    onError: (err) => {
      toast.error(`Failed to save session: ${err.message}`);
    }
  });

  const handleSaveBillingSession = async () => {
    const webview = webviewRefs.current.get(activeTabId);
    if (!billingModeProviderId || !webview) return;
    try {
      // @ts-ignore Electron webview method
      const currentUrl = await webview.executeJavaScript('window.location.href');
      // @ts-ignore Electron webview method
      const cookieStr = await webview.executeJavaScript('document.cookie');
      
      const parsedCookies = cookieStr ? cookieStr.split('; ').map((c: string) => {
        const [name, ...rest] = c.split('=');
        return {
          name,
          value: rest.join('='),
          domain: new URL(currentUrl).hostname,
          path: '/'
        };
      }) : [];

      saveBillingSessionMutation.mutate({
        providerId: billingModeProviderId,
        dashboardUrl: currentUrl,
        cookies: parsedCookies
      });
    } catch (err) {
      console.error(err);
      toast.error('Could not extract cookies from browser.');
    }
  };

  const handleExtractContext = async () => {
    try {
      const toastId = toast.loading("Extracting clean context for AI...");
      const result = await extractMutation.mutateAsync({ url });
      
      // Dispatch to global context buffer
      appendContextBuffer(`[Extracted from ${result.url}]\n\n# ${result.title}\n\n${result.markdown}`);
      
      setReaderContent(`# ${result.title}\n\n${result.markdown}`);
      setIsReaderMode(true);
      toast.dismiss(toastId);
      toast.success("Context dispatched to Agent buffer!");
    } catch (err) {
      toast.error("Extraction Failed", { description: (err as Error).message });
    }
  };

  const handleAddBookmark = async () => {
    const webview = webviewRefs.current.get(activeTabId);
    let title = activeTab.title;
    
    if (webview && isElectron()) {
      try {
        // @ts-ignore
        title = await webview.executeJavaScript('document.title');
      } catch (e) { console.error(e); }
    }
    
    setBookmarkTitle(title);
    setSelectedFolderId(folders?.[0]?.id || null);
    setShowBookmarkPopover(true);
  };

  const handleSaveBookmark = () => {
    createBookmarkMutation.mutate({
      title: bookmarkTitle || "New Bookmark",
      url: url,
      folderId: selectedFolderId
    });
  };

  const handleSaveFolder = () => {
    if (!newFolderName.trim()) return;
    createFolderMutation.mutate({
      name: newFolderName.trim()
    });
  };

  const handleDomSelection = () => {
    toast.info("DOM Selector Mode active. Click an element to extract its path.");
    // Placeholder for handleDomSelection
  };

  useEffect(() => {
    if (isSelectingDOM) {
      handleDomSelection();
    }
  }, [isSelectingDOM]);

  // Sync URL/Content to context
  useEffect(() => {
    if (onLoad) {
        if (isReaderMode) onLoad(readerContent);
        else onLoad(url);
    }
  }, [url, onLoad, isReaderMode, readerContent]);

  // Update input when active tab changes
  useEffect(() => {
    setInput(activeTab.url);
  }, [activeTabId, activeTab.url]);

  // Sync internal state with external prop updates
  useEffect(() => {
    if (initialUrl && !tabs.some(t => t.url === initialUrl)) {
        const newId = `tab-${Date.now()}`;
        setTabs(prev => [...prev, { id: newId, url: initialUrl, title: 'External Link', isReady: false }]);
        setActiveTabId(newId);
    }
  }, [initialUrl]); 

  const [showDebugView, setShowDebugView] = useState(false);
  const [blockAds, setBlockAds] = useState(true);
  const [mobileUA, setMobileUA] = useState(false);

  const handleGo = (targetUrl?: string) => {
    const target = targetUrl || parseOmniboxInput(input);
    
    setTabs(prev => prev.map(t => 
      t.id === activeTabId ? { ...t, url: target, isReady: false } : t
    ));
    setInput(target);
    setIsReaderMode(false);
  };

  const handleAddTab = () => {
    const newId = `tab-${Date.now()}`;
    setTabs(prev => [...prev, { id: newId, url: 'https://duckduckgo.com', title: 'New Tab', isReady: false }]);
    setActiveTabId(newId);
  };

  const handleCloseTab = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (tabs.length === 1) return;
    
    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);
    webviewRefs.current.delete(id);
    
    if (activeTabId === id) {
      setActiveTabId(newTabs[newTabs.length - 1].id);
    }
  };

  const handleBack = () => {
    if (isReaderMode) { setIsReaderMode(false); return; }
    const webview = webviewRefs.current.get(activeTabId);
    if (webview && isReady) {
      // @ts-ignore
      webview.goBack();
    }
  };
  const handleForward = () => {
    const webview = webviewRefs.current.get(activeTabId);
    if (webview && isReady) {
      // @ts-ignore
      webview.goForward();
    }
  };
  const handleReload = () => {
    if (isReaderMode) { void handleExtractContext(); return; }
    const webview = webviewRefs.current.get(activeTabId);
    if (webview && isReady) {
      // @ts-ignore
      webview.reload();
    }
  };

  const onReady = useCallback(async (id: string) => {
    const webview = webviewRefs.current.get(id);
    let title = '';
    if (webview && isElectron()) {
      try {
        // @ts-ignore
        title = await webview.executeJavaScript('document.title');
      } catch (e) { console.error(e); }
    }
    
    setTabs(prev => prev.map(t => t.id === id ? { ...t, isReady: true, title: title || t.title } : t));
  }, []);
  const onFail = useCallback((e: any) => {
    console.warn('WebView failed to load:', e);
    if (e.errorCode !== -3) {
      toast.error(`Failed to load: ${e.validatedURL}`, { description: e.errorDescription });
    }
  }, []);

  const settingsContent = (
    <div className="space-y-6 text-foreground">
      <div className="space-y-2">
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Active Role</label>
        <div className="p-3 bg-muted rounded border border-border flex items-center justify-between">
            <span>Research Agent (GPT-4)</span>
            <span className="text-xs text-muted-foreground">▼</span>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Debugging</label>
        <div className="p-3 bg-muted/50 rounded border border-border space-y-3">
            <div className="flex items-center gap-3">
                <input 
                    type="checkbox" 
                    id="debug-toggle" 
                    checked={showDebugView} 
                    onChange={e => setShowDebugView(e.target.checked)}
                    className="w-4 h-4 accent-secondary bg-accent border-input rounded focus:ring-secondary focus:ring-offset-0"
                />
                <div>
                    <label htmlFor="debug-toggle" className="block text-sm font-medium text-foreground">Show Agent&apos;s &quot;Research Browser&quot; Stream</label>
                </div>
            </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Options</label>
        <div className="space-y-2">
            <label className="flex items-center gap-3 p-2 hover:bg-muted rounded cursor-pointer transition-colors">
                <input 
                    type="checkbox" 
                    checked={blockAds} 
                    onChange={e => setBlockAds(e.target.checked)}
                    className="w-4 h-4 accent-info rounded"
                />
                <span className="text-sm">Block Ads</span>
            </label>
            <label className="flex items-center gap-3 p-2 hover:bg-muted rounded cursor-pointer transition-colors">
                <input 
                    type="checkbox" 
                    checked={mobileUA} 
                    onChange={e => setMobileUA(e.target.checked)}
                    className="w-4 h-4 accent-info rounded"
                />
                <span className="text-sm">Mobile User Agent</span>
            </label>
        </div>
      </div>
    </div>
  );

  const content = (
    <div className="flex flex-col w-full h-full bg-background relative overflow-hidden">
         {billingModeProviderId && (
            <div className="bg-indigo-600 border-b border-indigo-500 p-3 flex items-center justify-between shadow-lg z-50">
              <div className="text-white font-bold text-sm tracking-wide">
                Log in to the provider, then click here to save session.
              </div>
              <button 
                onClick={handleSaveBillingSession}
                disabled={saveBillingSessionMutation.isLoading}
                className="bg-white text-indigo-600 px-4 py-1.5 rounded font-bold text-xs shadow hover:bg-zinc-100 disabled:opacity-50 transition-colors"
              >
                {saveBillingSessionMutation.isLoading ? 'Saving...' : 'Set as Billing Link & Save Session'}
              </button>
            </div>
         )}
         
         {!showDebugView && (
            <div className="flex flex-col shrink-0 bg-background border-b border-border z-30 shadow-sm">
                {/* Compact Tab Bar */}
                <div className="h-9 flex items-center bg-muted/20 border-b border-border/50 overflow-x-auto no-scrollbar px-1">
                  {tabs.map(tab => (
                    <div 
                      key={tab.id}
                      onClick={() => setActiveTabId(tab.id)}
                      className={cn(
                        "group flex items-center min-w-[120px] max-w-[180px] h-7 px-3 text-[10px] font-bold cursor-pointer rounded-t-md transition-all mr-0.5 border-x border-t",
                        activeTabId === tab.id 
                          ? "bg-background border-border text-foreground border-b-background z-10" 
                          : "bg-muted/40 border-transparent text-muted-foreground hover:bg-muted/60"
                      )}
                    >
                      <Globe size={10} className={cn("mr-2", activeTabId === tab.id ? "text-primary" : "text-muted-foreground/50")} />
                      <span className="truncate flex-1">{tab.title}</span>
                      <button 
                        onClick={(e) => handleCloseTab(e, tab.id)}
                        className="ml-2 opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                      >
                        <CloseIcon size={10} />
                      </button>
                    </div>
                  ))}
                  <button 
                    onClick={handleAddTab}
                    className="p-1.5 hover:bg-muted rounded text-muted-foreground ml-1"
                  >
                    <Plus size={12} />
                  </button>
                </div>

                {/* Main Toolbar */}
                <div className="h-10 flex items-center px-2 space-x-2">
                    <div className="flex items-center space-x-0.5">
                        <button type="button" onClick={handleBack} disabled={!isReady} className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground disabled:opacity-20">
                            <ArrowLeft size={16} />
                        </button>
                        <button type="button" onClick={handleForward} disabled={!isReady} className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground disabled:opacity-20">
                            <ArrowRight size={16} />
                        </button>
                        <button type="button" onClick={handleReload} disabled={!isReady} className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground disabled:opacity-20">
                            <RotateCw size={16} />
                        </button>
                    </div>
                    
                    {/* Draggable URL Input */}
                    <div 
                      className="flex-1 relative group"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', url);
                        e.dataTransfer.effectAllowed = 'copy';
                      }}
                    >
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                            <Lock size={12} className="opacity-50" />
                        </div>
                        <input 
                            className="w-full bg-card/50 text-foreground text-xs font-mono rounded py-1.5 pl-8 pr-12 border border-border focus:bg-card focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all cursor-grab active:cursor-grabbing"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleGo(); }}
                            onFocus={e => e.target.select()}
                            placeholder="Enter URL or search..."
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-1.5 space-x-1">
                          <button 
                            type="button" 
                            onClick={handleAddBookmark}
                            className={cn(
                              "p-1 hover:bg-muted rounded transition-colors",
                              showBookmarkPopover ? "text-yellow-500" : "text-muted-foreground hover:text-yellow-500"
                            )}
                          >
                            <Star size={14} />
                          </button>
                        </div>

                        {/* Bookmark Popover */}
                        {showBookmarkPopover && (
                          <div className="absolute top-full right-0 mt-2 w-64 bg-zinc-950 border border-border shadow-2xl rounded-lg p-4 z-50 flex flex-col space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Add Bookmark</h4>
                            <div className="space-y-1">
                              <label className="text-[10px] text-muted-foreground font-bold uppercase">Title</label>
                              <input 
                                className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
                                value={bookmarkTitle}
                                onChange={e => setBookmarkTitle(e.target.value)}
                                autoFocus
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] text-muted-foreground font-bold uppercase">Folder</label>
                              {isCreatingFolder ? (
                                <div className="flex space-x-2">
                                  <input 
                                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
                                    placeholder="New folder name..."
                                    value={newFolderName}
                                    onChange={e => setNewFolderName(e.target.value)}
                                    autoFocus
                                  />
                                  <button 
                                    onClick={handleSaveFolder}
                                    disabled={createFolderMutation.isLoading}
                                    className="px-2 py-1 text-xs bg-primary text-primary-foreground font-bold rounded shadow hover:opacity-90"
                                  >
                                    {createFolderMutation.isLoading ? '...' : 'Save'}
                                  </button>
                                </div>
                              ) : (
                                <div className="flex space-x-2">
                                  <select 
                                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-white focus:outline-none"
                                    value={selectedFolderId || ''}
                                    onChange={e => setSelectedFolderId(e.target.value || null)}
                                  >
                                    <option value="">No Folder</option>
                                    {folders?.map((f: any) => (
                                      <option key={f.id} value={f.id}>{f.name}</option>
                                    ))}
                                  </select>
                                  <button 
                                    onClick={() => setIsCreatingFolder(true)}
                                    className="px-2 py-1 text-xs bg-muted text-muted-foreground hover:text-white rounded"
                                  >
                                    +
                                  </button>
                                </div>
                              )}
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                              <button onClick={() => { setShowBookmarkPopover(false); setIsCreatingFolder(false); setNewFolderName(''); }} className="px-3 py-1 text-xs text-muted-foreground hover:text-white">Cancel</button>
                              <button 
                                onClick={handleSaveBookmark} 
                                disabled={createBookmarkMutation.isLoading}
                                className="px-3 py-1 text-xs bg-primary text-primary-foreground font-bold rounded shadow hover:opacity-90"
                              >
                                {createBookmarkMutation.isLoading ? 'Saving...' : 'Save'}
                              </button>
                            </div>
                          </div>
                        )}
                    </div>

                    <div className="flex items-center space-x-1">
                        <SuperAiButton 
                            label="Extract Context"
                            contextId={url}
                            onGenerate={() => void handleExtractContext()}
                            style={{ '--ai-btn-primary': 'var(--ai-intent-browser)', '--ai-btn-size': '28px' } as React.CSSProperties}
                        />
                        <button 
                            type="button" 
                            onClick={() => setIsSelectingDOM(!isSelectingDOM)} 
                            className={cn(
                              "p-1.5 rounded transition-colors",
                              isSelectingDOM ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
                            )}
                            title="Selector Mode"
                        >
                            <Crosshair size={16} />
                        </button>
                    </div>
                </div>

                {/* Bookmarks Bar */}
                <div className="h-8 border-t border-border/50 bg-card/30 flex items-center px-3 space-x-4 overflow-x-auto no-scrollbar">
                  {folders?.map((folder: any) => (
                    <div key={folder.id} className="group relative flex items-center space-x-1.5 text-[10px] font-bold text-muted-foreground hover:text-foreground cursor-pointer whitespace-nowrap py-1">
                      <Folder size={12} className="text-muted-foreground/60" />
                      <span>{folder.name}</span>
                      <ChevronDown size={10} className="opacity-50" />
                      
                      {/* Simple Dropdown Mock */}
                      <div className="absolute top-full left-0 mt-0 hidden group-hover:block z-[100] bg-zinc-900 border border-zinc-800 rounded shadow-2xl py-1 min-w-[140px]">
                        {folder.bookmarks?.map((bm: any) => (
                          <div 
                            key={bm.id} 
                            onClick={() => handleGo(bm.url)}
                            className="px-3 py-1.5 hover:bg-white/5 flex items-center justify-between text-[10px]"
                          >
                            <span className="truncate mr-2">{bm.title}</span>
                            <ExternalLink size={10} className="opacity-30" />
                          </div>
                        ))}
                        {(!folder.bookmarks || folder.bookmarks.length === 0) && (
                          <div className="px-3 py-2 text-zinc-600 italic">Empty</div>
                        )}
                      </div>
                    </div>
                  ))}
                  <button className="p-1 hover:bg-muted rounded text-muted-foreground opacity-40 hover:opacity-100">
                    <Plus size={12} />
                  </button>
                </div>
            </div>
         )}

        {/* BROWSER CONTENT */}
        <div className="flex-1 relative bg-white overflow-hidden">
            {isReaderMode && (
                <div className="absolute inset-0 z-40 bg-[var(--bg-background)] overflow-y-auto p-8 custom-scrollbar">
                    <div className="max-w-2xl mx-auto">
                        <div className="flex items-center justify-between mb-8 pb-4 border-b border-border">
                          <h2 className="text-xl font-bold text-foreground">Reader View</h2>
                          <button 
                            onClick={() => setIsReaderMode(false)}
                            className="text-xs text-muted-foreground hover:text-foreground px-3 py-1 rounded bg-muted"
                          >
                            Back to Browser
                          </button>
                        </div>
                        <pre className="whitespace-pre-wrap font-mono text-sm text-zinc-300 leading-relaxed">
                            {readerContent}
                        </pre>
                    </div>
                </div>
            )}
            
            {!isElectron() && !showDebugView && (
                 <div className="absolute inset-0 z-50 flex items-center justify-center bg-card/80 backdrop-blur-sm p-8">
                    <div className="bg-warning/20 border border-warning/50 p-6 rounded-lg max-w-md text-center">
                        <h3 className="text-warning font-bold mb-2">Electron Required</h3>
                        <p className="text-warning/60 text-sm mb-4">
                            The native browser view requires the Electron app for persistence and deep integration.
                        </p>
                        <button 
                            type="button"
                            onClick={() => setShowDebugView(true)}
                            className="px-4 py-2 bg-warning hover:bg-warning/80 text-black font-bold rounded transition-colors"
                        >
                            Switch to Remote Browser
                        </button>
                    </div>
                 </div>
            )}

            {showDebugView ? (
                <div className="w-full h-full bg-card">
                    <ResearchBrowser key={`research-${cardId}-${screenspaceId}`} cardId={cardId} screenspaceId={screenspaceId} initialUrl={url} />
                </div>
            ) : (
                <>
                  {tabs.map(tab => (
                    <div key={tab.id} className={cn("w-full h-full", activeTabId === tab.id ? "block" : "hidden")}>
                      <PersistentBrowser 
                        id={tab.id}
                        url={tab.url}
                        webviewRef={(node) => {
                          if (node) webviewRefs.current.set(tab.id, node);
                          else webviewRefs.current.delete(tab.id);
                        }}
                        onReady={onReady}
                        onFail={onFail}
                        mobileUA={mobileUA}
                        isReaderMode={isReaderMode}
                        isElectron={!!isElectron()}
                      />
                    </div>
                  ))}
                </>
            )}
        </div>
    </div>
  );

  if (hideWrapper) return content;

  return (
    <UniversalCardWrapper
      id={id}
      title="Smart Agentic Browser"
      icon={Globe}
      aiContext={url}
      settings={settingsContent}
      headerEnd={headerEnd}
      hideAiButton={true}
    >
        {content}
    </UniversalCardWrapper>
  );
}
