import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, publicProcedure } from '../trpc.js';
import { bookmarkStorage } from '../utils/bookmarkStorage.js';

/**
 * Bookmark Router - Manages folders and bookmarks for the agentic browser
 * Uses JSON file storage instead of database
 */
export const bookmarkRouter = createTRPCRouter({
  // --- Folders ---
  
  listFolders: publicProcedure.query(async () => {
    try {
      return await bookmarkStorage.listFolders();
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Failed to list folders',
      });
    }
  }),

  createFolder: publicProcedure
    .input(z.object({
      name: z.string(),
      parentId: z.string().optional().nullable(),
    }))
    .mutation(async ({ input }) => {
      try {
        return await bookmarkStorage.createFolder({
          name: input.name,
          parentId: input.parentId ?? undefined,
        });
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create folder',
        });
      }
    }),

  updateFolder: publicProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      parentId: z.string().optional().nullable(),
    }))
    .mutation(async ({ input }) => {
      try {
        return await bookmarkStorage.updateFolder({
          id: input.id,
          ...(input.name && { name: input.name }),
          ...(input.parentId !== undefined && { parentId: input.parentId }),
        });
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update folder',
        });
      }
    }),

  deleteFolder: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      try {
        await bookmarkStorage.deleteFolder(input.id);
        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to delete folder',
        });
      }
    }),

  // --- Bookmarks ---

  listBookmarks: publicProcedure
    .input(z.object({ folderId: z.string().optional().nullable() }))
    .query(async ({ input }) => {
      try {
        return await bookmarkStorage.listBookmarks(input.folderId);
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to list bookmarks',
        });
      }
    }),

  createBookmark: publicProcedure
    .input(z.object({
      title: z.string(),
      url: z.string(),
      faviconUrl: z.string().optional().nullable(),
      folderId: z.string().optional().nullable(),
    }))
    .mutation(async ({ input }) => {
      try {
        return await bookmarkStorage.createBookmark({
          title: input.title,
          url: input.url,
          faviconUrl: input.faviconUrl ?? undefined,
          folderId: input.folderId ?? undefined,
        });
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create bookmark',
        });
      }
    }),

  updateBookmark: publicProcedure
    .input(z.object({
      id: z.string(),
      title: z.string().optional(),
      url: z.string().optional(),
      faviconUrl: z.string().optional().nullable(),
      folderId: z.string().optional().nullable(),
    }))
    .mutation(async ({ input }) => {
      try {
        return await bookmarkStorage.updateBookmark({
          id: input.id,
          ...(input.title && { title: input.title }),
          ...(input.url && { url: input.url }),
          ...(input.faviconUrl !== undefined && { faviconUrl: input.faviconUrl }),
          ...(input.folderId !== undefined && { folderId: input.folderId }),
        });
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update bookmark',
        });
      }
    }),

  deleteBookmark: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      try {
        await bookmarkStorage.deleteBookmark(input.id);
        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to delete bookmark',
        });
      }
    }),
});
