export interface FileEntry {
  name: string;
  type: 'file' | 'directory';
  path: string;
  size?: number;
}

export interface IVfsProvider {
  list(path: string): Promise<FileEntry[]>;
  read(path: string): Promise<string>;
  write(path: string, content: string | Buffer): Promise<void>;
  mkdir(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
}
