export interface VFile {
  path: string;
  content?: string;
  type: 'file' | 'directory';
  size?: number;
  children?: VFile[];
}

export type FileSystemProviderType = 'local' | 'ssh';
