import { promises as fs } from 'fs';
import { join } from 'path';
import { v4 as uuid } from 'uuid';

export interface BookmarkFolder {
  id: string;
  name: string;
  parentId: string | null;
  children: BookmarkFolder[];
  bookmarks: Bookmark[];
  createdAt: string;
  updatedAt: string;
}

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  faviconUrl: string | null;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface BookmarkData {
  folders: Record<string, BookmarkFolder>;
  bookmarks: Record<string, Bookmark>;
}

const DATA_DIR = join(process.cwd(), '.userData', 'bookmarks');
const DATA_FILE = join(DATA_DIR, 'bookmarks.json');

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create bookmarks data directory:', error);
  }
}

// Read all bookmark data
async function readData(): Promise<BookmarkData> {
  await ensureDataDir();
  try {
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // File doesn't exist yet, return empty data
    return { folders: {}, bookmarks: {} };
  }
}

// Write all bookmark data
async function writeData(data: BookmarkData): Promise<void> {
  await ensureDataDir();
  try {
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to write bookmarks data:', error);
    throw error;
  }
}

// Build folder hierarchy from flat structure
function buildFolderHierarchy(foldersMap: Record<string, BookmarkFolder>, bookmarksMap: Record<string, Bookmark>): BookmarkFolder[] {
  const rootFolders: BookmarkFolder[] = [];
  const processed = new Set<string>();

  // Process root folders first
  Object.values(foldersMap).forEach(folder => {
    if (!folder.parentId) {
      const enhanced = { ...folder, children: [], bookmarks: [] };
      rootFolders.push(enhanced);
      processed.add(folder.id);
    }
  });

  // Recursively add children
  function addChildren(parent: BookmarkFolder) {
    Object.values(foldersMap).forEach(folder => {
      if (folder.parentId === parent.id && !processed.has(folder.id)) {
        const child = { ...folder, children: [], bookmarks: [] };
        parent.children.push(child);
        processed.add(folder.id);
        addChildren(child);
      }
    });

    // Add bookmarks to this folder
    Object.values(bookmarksMap).forEach(bookmark => {
      if (bookmark.folderId === parent.id) {
        parent.bookmarks.push(bookmark);
      }
    });
  }

  rootFolders.forEach(addChildren);
  return rootFolders;
}

export const bookmarkStorage = {
  async listFolders(): Promise<BookmarkFolder[]> {
    const data = await readData();
    return buildFolderHierarchy(data.folders, data.bookmarks);
  },

  async createFolder(input: { name: string; parentId?: string | null }): Promise<BookmarkFolder> {
    const data = await readData();
    const id = uuid();
    const now = new Date().toISOString();
    const folder: BookmarkFolder = {
      id,
      name: input.name,
      parentId: input.parentId || null,
      children: [],
      bookmarks: [],
      createdAt: now,
      updatedAt: now,
    };
    data.folders[id] = folder;
    await writeData(data);
    return folder;
  },

  async updateFolder(input: { id: string; name?: string; parentId?: string | null }): Promise<BookmarkFolder> {
    const data = await readData();
    const folder = data.folders[input.id];
    if (!folder) {
      throw new Error(`Folder not found: ${input.id}`);
    }
    if (input.name !== undefined) folder.name = input.name;
    if (input.parentId !== undefined) folder.parentId = input.parentId || null;
    folder.updatedAt = new Date().toISOString();
    await writeData(data);
    return folder;
  },

  async deleteFolder(id: string): Promise<void> {
    const data = await readData();
    if (!data.folders[id]) {
      throw new Error(`Folder not found: ${id}`);
    }
    delete data.folders[id];
    // Also remove any bookmarks in this folder
    Object.keys(data.bookmarks).forEach(key => {
      if (data.bookmarks[key].folderId === id) {
        delete data.bookmarks[key];
      }
    });
    await writeData(data);
  },

  async listBookmarks(folderId?: string | null): Promise<Bookmark[]> {
    const data = await readData();
    const bookmarks = Object.values(data.bookmarks);
    if (folderId !== undefined && folderId !== null) {
      return bookmarks.filter(b => b.folderId === folderId).sort((a, b) => a.title.localeCompare(b.title));
    }
    return bookmarks.sort((a, b) => a.title.localeCompare(b.title));
  },

  async createBookmark(input: { title: string; url: string; faviconUrl?: string | null; folderId?: string | null }): Promise<Bookmark> {
    const data = await readData();
    const id = uuid();
    const now = new Date().toISOString();
    const bookmark: Bookmark = {
      id,
      title: input.title,
      url: input.url,
      faviconUrl: input.faviconUrl || null,
      folderId: input.folderId || null,
      createdAt: now,
      updatedAt: now,
    };
    data.bookmarks[id] = bookmark;
    await writeData(data);
    return bookmark;
  },

  async updateBookmark(input: { id: string; title?: string; url?: string; faviconUrl?: string | null; folderId?: string | null }): Promise<Bookmark> {
    const data = await readData();
    const bookmark = data.bookmarks[input.id];
    if (!bookmark) {
      throw new Error(`Bookmark not found: ${input.id}`);
    }
    if (input.title !== undefined) bookmark.title = input.title;
    if (input.url !== undefined) bookmark.url = input.url;
    if (input.faviconUrl !== undefined) bookmark.faviconUrl = input.faviconUrl || null;
    if (input.folderId !== undefined) bookmark.folderId = input.folderId || null;
    bookmark.updatedAt = new Date().toISOString();
    await writeData(data);
    return bookmark;
  },

  async deleteBookmark(id: string): Promise<void> {
    const data = await readData();
    if (!data.bookmarks[id]) {
      throw new Error(`Bookmark not found: ${id}`);
    }
    delete data.bookmarks[id];
    await writeData(data);
  },
};
