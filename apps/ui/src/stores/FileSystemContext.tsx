import { createContext, useContext } from 'react';
import type { VFile, FileSystemProviderType } from './FileSystemTypes.js';
import type { SshConfig } from '../components/SshConnectionModal.js';

interface FileSystemContextType {
  files: VFile[];
  currentProvider: FileSystemProviderType;
  sshConnectionId: string | null;
  currentPath: string;
  isLoading: boolean;
  
  // Actions
  setProvider: (provider: FileSystemProviderType) => void;
  setSshConnection: (connectionId: string) => void;
  navigate: (path: string) => void;
  
  // CRUD
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<void>;
  createFile: (path: string, initialContent?: string) => Promise<void>;
  mkdir: (path: string) => Promise<void>;
  connectSsh: (config: SshConfig) => Promise<string>;
  refresh: () => void;
}

export const FileSystemContext = createContext<FileSystemContextType | null>(null);

export const useFileSystem = () => {
  const context = useContext(FileSystemContext);
  if (!context) throw new Error("useFileSystem must be used within a FileSystemProvider");
  return context;
};
