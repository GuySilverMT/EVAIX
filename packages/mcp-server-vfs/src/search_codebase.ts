import * as path from 'path';

const searchInFile = async (fs: any, filePath: string, query: string): Promise<boolean> => {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return content.toString().includes(query);
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return false;
  }
};

const searchInDirectory = async (fs: any, dirPath: string, query: string): Promise<string[]> => {
  let results: string[] = [];
  const dirents = await fs.readdir(dirPath);

  for (const dirent of dirents) {
    const fullPath = path.join(dirPath, dirent);

    if (dirent === 'node_modules') {
      continue;
    }

    const stat = await fs.stat(fullPath);

    if (stat.isDirectory()) {
      results = results.concat(await searchInDirectory(fs, fullPath, query));
    } else if (stat.isFile()) {
      if (await searchInFile(fs, fullPath, query)) {
        results.push(fullPath);
      }
    }
  }

  return results;
};

export const searchCodebase = async (fs: any, query: string): Promise<string[]> => {
  return searchInDirectory(fs, '/', query);
};
