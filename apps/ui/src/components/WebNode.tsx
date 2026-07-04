/**
 * @file WebNode.tsx
 * @description The pure content payload container (iframe/webview) of an AppCard in EVAIX Spatial Window Manager.
 * Encapsulates web-native tools into chromeless agentic web nodes with persistent state and context extraction.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Crosshair } from 'lucide-react';
import { trpc } from '../utils/trpc';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { useWorkspaceStore } from '../stores/workspace.store';
import { ModelBar } from './ui/ModelBar';
import { useAgenticContext } from '../hooks/useAgenticContext';

// WebNode modules
import { useBrowserTabs } from './webnode/useBrowserTabs';
import { useBookmarks } from './webnode/useBookmarks';
import { isElectron, getLoadErrorMessage, parseCookies } from './webnode/utils';
import { BrowserTabs } from './webnode/BrowserTabs';
import { BrowserControls } from './webnode/BrowserControls';
import { BookmarkPopover } from './webnode/BookmarkPopover';
import { BookmarkBar } from './webnode/BookmarkBar';
import { BillingBanner } from './webnode/BillingBanner';
import { ReaderView } from './webnode/ReaderView';
import { PersistentBrowser } from './webnode/PersistentBrowser';
import { WebViewLoadEvent } from './webnode/types';

export interface WebNodeProps {
  id?: string;
  cardId?: string;
  headerEnd?: React.ReactNode;
  initialUrl?: string;
  onLoad?: (content: string) => void;
  hideWrapper?: boolean;
  billingModeProviderId?: string;
  onBillingSessionSaved?: () => void;
}

export const WebNode: React.FC<WebNodeProps> = ({
  id: _id = 'webnode-default',
  cardId: _cardId,
  headerEnd: _headerEnd,
  initialUrl = 'https://www.google.com',
  onLoad,
  hideWrapper,
  billingModeProviderId,
  onBillingSessionSaved
}) => {
  const [isReaderMode, setIsReaderMode] = useState(false);
  const [readerContent, setReaderContent] = useState<string>('');
  const [isSelectingDOM, setIsSelectingDOM] = useState(false);
  const [mobileUA, setMobileUA] = useState(false);
  const [showDebugView, setShowDebugView] = useState(false);

  const appendContextBuffer = useWorkspaceStore(state => state.appendContextBuffer);

  // Browser tabs management
  const {
    activeTabId,
    tabs,
    url,
    isReady,
    input,
    setInput,
    webviewRefs,
    setActiveTabId,
    handleGo,
    handleAddTab,
    handleCloseTab,
    handleBack,
    handleForward,
    handleReload,
    onTabReady
  } = useBrowserTabs({
    initialUrl,
    onUrlChange: () => {
      setIsReaderMode(false);
    }
  });

  // Bookmarks management
  const {
    folders,
    showBookmarkPopover,
    bookmarkTitle,
    setBookmarkTitle,
    selectedFolderId,
    setSelectedFolderId,
    isCreatingFolder,
    setIsCreatingFolder,
    newFolderName,
    setNewFolderName,
    createBookmarkMutation,
    createFolderMutation,
    handleAddBookmark,
    handleSaveBookmark,
    handleSaveFolder,
    closeBookmarkPopover
  } = useBookmarks();

  // Context extraction
  const extractMutation = trpc.browser.extractMarkdown.useMutation();

  const handleExtractContext = useCallback(async () => {
    try {
      const toastId = toast.loading('Extracting clean context for AI...');
      const result = await extractMutation.mutateAsync({ url });

      appendContextBuffer(`[Extracted from ${result.url}]\n\n# ${result.title}\n\n${result.markdown}`);

      setReaderContent(`# ${result.title}\n\n${result.markdown}`);
      setIsReaderMode(true);
      toast.dismiss(toastId);
      toast.success('Context dispatched to Agent buffer!');
    } catch (err) {
      toast.error('Extraction Failed', { description: (err as Error).message });
    }
  }, [url, extractMutation, appendContextBuffer]);

  // Billing session management
  const saveBillingSessionMutation = trpc.providers.saveBillingSession.useMutation({
    onSuccess: () => {
      toast.success('Billing session saved successfully!');
      if (onBillingSessionSaved) onBillingSessionSaved();
    },
    onError: (err) => {
      toast.error(`Failed to save session: ${err.message}`);
    }
  });

  const handleSaveBillingSession = useCallback(async () => {
    const webview = webviewRefs.current.get(activeTabId);
    if (!billingModeProviderId || !webview) return;
    try {
      const currentUrl = await webview.executeJavaScript('window.location.href');
      const cookieStr = await webview.executeJavaScript('document.cookie');

      const parsedCookies = parseCookies(cookieStr, currentUrl);

      saveBillingSessionMutation.mutate({
        providerId: billingModeProviderId,
        dashboardUrl: currentUrl,
        cookies: parsedCookies
      });
    } catch (err) {
      console.error(err);
      toast.error('Could not extract cookies from browser.');
    }
  }, [billingModeProviderId, activeTabId, webviewRefs, saveBillingSessionMutation]);

  // Bookmark handling from webview
  const handleAddBookmarkFromWebview = useCallback(async () => {
    const webview = webviewRefs.current.get(activeTabId);
    const tab = tabs.find(t => t.id === activeTabId);
    let title = tab?.title || 'Untitled';

    if (webview && isElectron()) {
      try {
        title = await webview.executeJavaScript('document.title');
      } catch (e) {
        console.error(e);
      }
    }

    handleAddBookmark(title);
  }, [activeTabId, tabs, webviewRefs, handleAddBookmark]);

  // DOM selection mode
  const handleDomSelection = useCallback(() => {
    toast.info('DOM Selector Mode active. Click an element to extract its path.');
  }, []);

  useEffect(() => {
    if (isSelectingDOM) {
      handleDomSelection();
    }
  }, [isSelectingDOM, handleDomSelection]);

  // Load callback
  useEffect(() => {
    if (onLoad) {
      if (isReaderMode) onLoad(readerContent);
      else onLoad(url);
    }
  }, [url, onLoad, isReaderMode, readerContent]);

  // Agentic context
  useAgenticContext({
    id: _cardId || url,
    type: 'browser',
    title: url,
    defaultIncluded: false,
    getContext: async () => {
      if (!url || url.trim() === '' || url === 'about:blank') {
        return { format: 'markdown', content: '' };
      }
      return {
        format: 'markdown',
        content: readerContent || url
      };
    }
  });

  // WebView error handling
  const onFail = useCallback((id: string, e: WebViewLoadEvent) => {
    const tab = tabs.find(tab => tab.id === id);
    const fallbackUrl = tab?.url || initialUrl;
    const validatedUrl = e?.validatedURL || fallbackUrl;
    const errorDescription = getLoadErrorMessage(e, fallbackUrl);

    console.warn(`WebView failed to load for tab ${id}:`, e);

    // Handle ERR_ABORTED separately - don't show toast
    if (e?.errorCode === -3) {
      console.info(`WebView navigation aborted for tab ${id}:`, e);
      return;
    }

    if (errorDescription) {
      toast.error(`Failed to load: ${validatedUrl}`, { description: errorDescription });
    }
  }, [initialUrl, tabs]);

  // Reload with context extraction
  const handleReloadWithContext = useCallback(() => {
    if (isReaderMode) {
      void handleExtractContext();
      return;
    }
    handleReload();
  }, [isReaderMode, handleExtractContext, handleReload]);

  const content = (
    <div className="flex flex-col w-full h-full bg-background relative overflow-hidden">
      <BillingBanner
        providerId={billingModeProviderId}
        onSaveSession={handleSaveBillingSession}
        isSaving={saveBillingSessionMutation.isLoading}
      />

      {!showDebugView && !hideWrapper && (
        <div className="flex flex-col shrink-0 bg-background border-b border-border z-30 shadow-sm">
          <BrowserTabs
            tabs={tabs}
            activeTabId={activeTabId}
            onTabClick={setActiveTabId}
            onAddTab={handleAddTab}
            onCloseTab={handleCloseTab}
          />

          <BrowserControls
            input={input}
            onInputChange={setInput}
            onGo={handleGo}
            onBack={handleBack}
            onForward={handleForward}
            onReload={handleReloadWithContext}
            isReady={isReady}
            onAddBookmark={handleAddBookmarkFromWebview}
            bookmarkActive={showBookmarkPopover}
          >
            <BookmarkPopover
              show={showBookmarkPopover}
              bookmarkTitle={bookmarkTitle}
              onTitleChange={setBookmarkTitle}
              selectedFolderId={selectedFolderId}
              onFolderChange={setSelectedFolderId}
              isCreatingFolder={isCreatingFolder}
              onToggleCreateFolder={() => setIsCreatingFolder(true)}
              newFolderName={newFolderName}
              onNewFolderNameChange={setNewFolderName}
              folders={folders}
              onSaveFolder={handleSaveFolder}
              onSaveBookmark={() => handleSaveBookmark(url)}
              onCancel={closeBookmarkPopover}
              isSavingFolder={createFolderMutation.isLoading}
              isSavingBookmark={createBookmarkMutation.isLoading}
            />
            <div className="flex items-center space-x-1">
              <ModelBar
                isCondensed
                expandDirection="right"
                contextLocation={url}
                onPlayClick={() => void handleExtractContext()}
              />
              <button
                type="button"
                onClick={() => setIsSelectingDOM(!isSelectingDOM)}
                className={cn(
                  'p-1.5 rounded transition-colors',
                  isSelectingDOM ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'
                )}
                title="Selector Mode"
              >
                <Crosshair size={16} />
              </button>
            </div>
          </BrowserControls>

          <BookmarkBar
            folders={folders}
            onBookmarkClick={handleGo}
          />
        </div>
      )}

      <div className="flex-1 relative bg-white overflow-hidden">
        <ReaderView
          show={isReaderMode}
          content={readerContent}
          onClose={() => setIsReaderMode(false)}
        />

        {!isElectron() && !showDebugView && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-card/80 backdrop-blur-sm p-8">
            <div className="bg-warning/20 border border-warning/50 p-6 rounded-lg max-w-md text-center">
              <h3 className="text-warning font-bold mb-2">Electron Required</h3>
              <p className="text-warning/60 text-sm mb-4">
                The native web view requires the Electron app for persistence and deep integration.
              </p>
            </div>
          </div>
        )}

        <>
          {tabs.map(tab => (
            <div key={tab.id} className={cn('w-full h-full', activeTabId === tab.id ? 'block' : 'hidden')}>
              <PersistentBrowser
                id={tab.id}
                url={tab.url}
                webviewRef={(node) => {
                  if (node) webviewRefs.current.set(tab.id, node);
                  else webviewRefs.current.delete(tab.id);
                }}
                onReady={onTabReady}
                onFail={onFail}
                mobileUA={mobileUA}
                isReaderMode={isReaderMode}
                isElectron={!!isElectron()}
              />
            </div>
          ))}
        </>
      </div>
    </div>
  );

  return content;
};

// Backward compatibility export
export const BrowserCard = WebNode;
