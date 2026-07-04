/**
 * @file useBrowserTabs.ts
 * @description Custom hook for managing browser tabs state
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Tab, ElectronWebView } from './types';

interface UseBrowserTabsOptions {
  initialUrl: string;
  onUrlChange?: (url: string) => void;
}

export function useBrowserTabs({ initialUrl, onUrlChange }: UseBrowserTabsOptions) {
  const [activeTabId, setActiveTabId] = useState<string>('default');
  const [tabs, setTabs] = useState<Tab[]>([
    { id: 'default', url: initialUrl, title: 'New Tab', isReady: false }
  ]);
  const [input, setInput] = useState(initialUrl);
  
  const webviewRefs = useRef<Map<string, ElectronWebView>>(new Map());
  
  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];
  const url = activeTab.url;
  const isReady = activeTab.isReady;

  // Update input when active tab changes
  useEffect(() => {
    setInput(activeTab.url);
  }, [activeTabId, activeTab.url]);

  // Add external URL as new tab if not already present
  useEffect(() => {
    if (initialUrl && !tabs.some(t => t.url === initialUrl)) {
      const newId = `tab-${Date.now()}`;
      setTabs(prev => [...prev, { id: newId, url: initialUrl, title: 'External Link', isReady: false }]);
      setActiveTabId(newId);
    }
  }, [initialUrl, tabs]);

  const handleGo = useCallback((targetUrl?: string) => {
    const target = targetUrl || input;
    
    setTabs(prev => prev.map(t => 
      t.id === activeTabId ? { ...t, url: target, isReady: false } : t
    ));
    setInput(target);
    onUrlChange?.(target);
  }, [input, activeTabId, onUrlChange]);

  const handleAddTab = useCallback(() => {
    const newId = `tab-${Date.now()}`;
    setTabs(prev => [...prev, { id: newId, url: 'https://duckduckgo.com', title: 'New Tab', isReady: false }]);
    setActiveTabId(newId);
  }, []);

  const handleCloseTab = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (tabs.length === 1) return;
    
    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);
    webviewRefs.current.delete(id);
    
    if (activeTabId === id) {
      setActiveTabId(newTabs[newTabs.length - 1].id);
    }
  }, [tabs.length, activeTabId]);

  const handleBack = useCallback(() => {
    const webview = webviewRefs.current.get(activeTabId);
    if (webview && isReady) {
      webview.goBack();
    }
  }, [activeTabId, isReady]);

  const handleForward = useCallback(() => {
    const webview = webviewRefs.current.get(activeTabId);
    if (webview && isReady) {
      webview.goForward();
    }
  }, [activeTabId, isReady]);

  const handleReload = useCallback(() => {
    const webview = webviewRefs.current.get(activeTabId);
    if (webview && isReady) {
      webview.reload();
    }
  }, [activeTabId, isReady]);

  const onTabReady = useCallback(async (id: string) => {
    const webview = webviewRefs.current.get(id);
    let title = '';
    if (webview) {
      try {
        title = await webview.getTitle();
      } catch (e) {
        console.error(e);
      }
    }
    
    setTabs(prev => prev.map(t => t.id === id ? { ...t, isReady: true, title: title || t.title } : t));
  }, []);

  return {
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
    onTabReady,
  };
}
