import fs from 'fs/promises';
import path from 'path';

export class CodePatchService {
  static async ApplyPatch(targetFile: string, findBlock: string, replaceBlock: string): Promise<{ success: boolean }> {
    try {
      let content = await fs.readFile(targetFile, 'utf-8');

      // Attempt exact match first
      if (content.includes(findBlock)) {
        content = content.replace(findBlock, replaceBlock);
      } else {
        // Fallback: Normalize line endings and handle leading whitespace
        const normalizedContent = content.replace(/\r\n/g, '\n');
        const normalizedSearchLines = findBlock.replace(/\r\n/g, '\n').split('\n');
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
          content = [...beforeMatch, replaceBlock, ...afterMatch].join('\n');
        } else {
          throw new Error(`Search string not found in file '${targetFile}'. Make sure you are providing the exact block to search for.`);
        }
      }

      await fs.writeFile(targetFile, content, 'utf-8');
      return { success: true };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);

      const errorLog = {
        timestamp: new Date().toISOString(),
        error: errorMessage,
        context: {
          targetFile,
          findBlock,
          replaceBlock
        }
      };

      const logPath = path.join(process.cwd(), 'system_patch_errors.log');
      await fs.appendFile(logPath, JSON.stringify(errorLog) + '\n', 'utf-8');

      throw new Error(`[CodePatchService] Patch application failed: ${errorMessage}`);
    }
  }
}
