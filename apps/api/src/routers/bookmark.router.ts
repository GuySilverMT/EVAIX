import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, publicProcedure } from '../trpc.js';

/**
 * Bookmark Router - Manages folders and bookmarks for the agentic browser
 */
export const bookmarkRouter = createTRPCRouter({
  // --- Folders ---
  
  listFolders: publicProcedure.query(async ({ ctx }) => {
    try {
      return await ctx.prisma.bookmarkFolder.findMany({
        include: {
          children: true,
          bookmarks: true,
        },
        orderBy: { name: 'asc' }
      });
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
    .mutation(async ({ input, ctx }) => {
      try {
        return await ctx.prisma.bookmarkFolder.create({
          data: {
            name: input.name,
            parentId: input.parentId,
          },
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
    .mutation(async ({ input, ctx }) => {
      try {
        return await ctx.prisma.bookmarkFolder.update({
          where: { id: input.id },
          data: {
            name: input.name,
            parentId: input.parentId,
          },
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
    .mutation(async ({ input, ctx }) => {
      try {
        await ctx.prisma.bookmarkFolder.delete({
          where: { id: input.id },
        });
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
    .query(async ({ input, ctx }) => {
      try {
        return await ctx.prisma.bookmark.findMany({
          where: input.folderId !== undefined ? { folderId: input.folderId } : {},
          orderBy: { title: 'asc' }
        });
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
    .mutation(async ({ input, ctx }) => {
      try {
        return await ctx.prisma.bookmark.create({
          data: {
            title: input.title,
            url: input.url,
            faviconUrl: input.faviconUrl,
            folderId: input.folderId,
          },
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
    .mutation(async ({ input, ctx }) => {
      try {
        return await ctx.prisma.bookmark.update({
          where: { id: input.id },
          data: {
            title: input.title,
            url: input.url,
            faviconUrl: input.faviconUrl,
            folderId: input.folderId,
          },
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
    .mutation(async ({ input, ctx }) => {
      try {
        await ctx.prisma.bookmark.delete({
          where: { id: input.id },
        });
        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to delete bookmark',
        });
      }
    }),
});
