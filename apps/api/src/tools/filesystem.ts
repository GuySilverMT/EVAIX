import fs from 'fs/promises';
import path from 'path';

export const createFsTools = (rootPath: string = process.cwd()) => {
  const resolvePath = (relativePath: string) => {
    const resolved = path.resolve(rootPath, relativePath);
    if (!resolved.startsWith(rootPath)) {
      throw new Error(`Access denied: Path '${relativePath}' is outside the allowable scope.`);
    }
    return resolved;
  };

  return {
    readFile: async ({ path: filePath }: { path: string }) => {
      return await fs.readFile(resolvePath(filePath), 'utf-8');
    },
    writeFile: async ({ path: filePath, content }: { path: string, content: string }) => {
      const fullPath = resolvePath(filePath);

      // Enforce patch_file over write_file for existing files
      try {
        await fs.access(fullPath);
        throw new Error(`File '${filePath}' already exists. To modify existing code, you MUST use the patch_file tool instead of write_file.`);
      } catch (err: any) {
        if (err.code !== 'ENOENT') {
           throw err; // Re-throw if it's an access or permission error
        }
      }

      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content);
      return { success: true };
    },
    patchFile: async ({ path: filePath, search_string, replace_string }: { path: string, search_string: string, replace_string: string }) => {
      const fullPath = resolvePath(filePath);
      let content = await fs.readFile(fullPath, 'utf-8');

      // Attempt exact match first
      if (content.includes(search_string)) {
        content = content.replace(search_string, replace_string);
      } else {
        // Fallback: Normalize line endings and handle leading whitespace
        const normalizedContent = content.replace(/\r\n/g, '\n');
        const normalizedSearchLines = search_string.replace(/\r\n/g, '\n').split('\n');
        const contentLines = normalizedContent.split('\n');

        let matchIdx = -1;
        for (let i = 0; i <= contentLines.length - normalizedSearchLines.length; i++) {
          let isMatch = true;
          for (let j = 0; j < normalizedSearchLines.length; j++) {
            if (contentLines[i + j].trim() !== normalizedSearchLines[j].trim()) {
              isMatch = false;
              break;
            }
          }
          if (isMatch) {
            matchIdx = i;
            break;
          }
        }

        if (matchIdx !== -1) {
          // We found the matching lines. Now replace them.
          const beforeMatch = contentLines.slice(0, matchIdx);
          const afterMatch = contentLines.slice(matchIdx + normalizedSearchLines.length);
          // Insert the replacement string as provided
          content = [...beforeMatch, replace_string, ...afterMatch].join('\n');
        } else {
          throw new Error(`Search string not found in file '${filePath}'. Make sure you are providing the exact block to search for.`);
        }
      }

      await fs.writeFile(fullPath, content);
      return { success: true };
    },
    listFiles: async ({ path: dirPath }: { path: string }) => {
      const fullPath = resolvePath(dirPath);
      const files = await fs.readdir(fullPath, { withFileTypes: true });
      return files.map(f => ({ name: f.name, isDir: f.isDirectory() }));
    }
  };
};

export const fsTools = createFsTools();
