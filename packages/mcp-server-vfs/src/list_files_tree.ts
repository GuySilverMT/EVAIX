import * as path from 'path';

interface FileTree {
  [key: string]: FileTree | null;
}

export const listFilesTree = async (fs: any, dirPath: string): Promise<FileTree> => {
  const tree: FileTree = {};
  const dirents = await fs.readdir(dirPath);

  for (const dirent of dirents) {
    const fullPath = path.join(dirPath, dirent);
    const stat = await fs.stat(fullPath);

    if (dirent === 'node_modules') {
      continue;
    }

    if (stat.isDirectory()) {
      tree[dirent] = await listFilesTree(fs, fullPath);
    } else {
      tree[dirent] = null;
    }
  }

  return tree;
};
