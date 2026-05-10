import { useState, useEffect, useCallback } from 'react';
import { trpc } from '../utils/trpc.js';
import type { VFile } from '../stores/FileSystemTypes.js';

export const useCardVFS = (cardId: string, initialPath: string = '/home/guy/mono') => {
  // State
  const [currentPath, setCurrentPath] = useState<string>(initialPath);
  const [provider, setProvider] = useState<'local' | 'ssh'>('local');
  const [connectionId, setConnectionId] = useState<string | undefined>(undefined);
  
  const [files, setFiles] = useState<VFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const utils = trpc.useUtils();

  // Helper: Build Tree
  const buildTree = useCallback((flatFiles: { path: string; type: 'file' | 'directory'; size?: number }[]): VFile[] => {
    return flatFiles.map(file => ({
      path: file.path,
      type: file.type,
      size: file.size,
      children: file.type === 'directory' ? [] : undefined
    }));
  }, []);

  // Actions
  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await utils.vfs.list.fetch({ 
        path: currentPath, 
        provider, 
        connectionId,
        cardId 
      });
      setFiles(buildTree(result as { path: string; type: 'file' | 'directory'; size?: number }[]));
    } catch (err) {
      console.error('VFS Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentPath, provider, connectionId, cardId, utils, buildTree]);

  // Load Children (Lazy)
  const loadChildren = useCallback(async (path: string): Promise<VFile[]> => {
    try {
      const result = await utils.vfs.list.fetch({ 
        path, 
        provider, 
        connectionId,
        cardId 
      });
      return buildTree(result as { path: string; type: 'file' | 'directory'; size?: number }[]);
    } catch (err) {
      console.error('VFS Load Children Error:', err);
      return [];
    }
  }, [provider, connectionId, cardId, utils, buildTree]);

  // Connect SSH
  const connectSsh = useCallback(async (credentials: Record<string, unknown>) => {
      const res = await utils.client.vfs.connectSsh.mutate(credentials as any);
      setConnectionId(res.connectionId);
      setProvider('ssh');
      void refresh();
  }, [utils, refresh]);

  // Ingest (Embedding)
  const ingestDirectory = useCallback(async (path: string) => {
      alert(`Started embedding ingestion for: ${path}`);
      await utils.client.vfs.ingestDirectory.mutate({
          path,
          provider,
          connectionId,
          cardId
      });
  }, [utils, provider, connectionId, cardId]);

  // Transfer (Drag & Drop)
  const transferFile = useCallback(async (source: string, dest: string, direction: 'upload' | 'download') => {
      await utils.client.vfs.transferFile.mutate({
          sourcePath: source,
          destPath: dest,
          direction,
          connectionId: connectionId!
      });
      void refresh();
  }, [utils, connectionId, refresh]);

  // Create Node
  const createNode = useCallback(async (type: 'file' | 'directory', name: string) => {
      const fullPath = `${currentPath}/${name}`;
      if (type === 'directory') {
          await utils.client.vfs.mkdir.mutate({ path: fullPath, provider, connectionId, cardId });
      } else {
          await utils.client.vfs.write.mutate({ path: fullPath, content: '', provider, connectionId, cardId });
      }
      void refresh();
  }, [currentPath, provider, connectionId, cardId, utils, refresh]);

  // Initial Load
  useEffect(() => { void refresh(); }, [refresh]);

  return {
    files,
    currentPath,
    provider,
    isLoading,
    navigateTo: setCurrentPath,
    refresh,
    loadChildren,
    connectSsh,
    ingestDirectory,
    transferFile,
    createNode,
    readFile: useCallback(async (path: string) => (await utils.vfs.read.fetch({ path, provider, connectionId, cardId })).content, [utils, provider, connectionId, cardId]),
    writeFile: useCallback(async (path: string, content: string) => {
        await utils.client.vfs.write.mutate({ path, content, provider, connectionId, cardId });
        await refresh();
    }, [utils, provider, connectionId, cardId, refresh]),
    mkdir: useCallback(async (path: string) => {
        await utils.client.vfs.mkdir.mutate({ path, provider, connectionId, cardId });
    }, [utils, provider, connectionId, cardId])
  };
};