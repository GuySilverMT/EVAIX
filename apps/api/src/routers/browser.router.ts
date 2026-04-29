import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, publicProcedure } from '../trpc.js';
import { browserService } from '../services/browser.service.js';

export const browserRouter = createTRPCRouter({
  navigate: publicProcedure
    .input(z.object({ 
      sessionId: z.string(),
      url: z.string().url() 
    }))
    .mutation(async ({ input }) => {
      return await browserService.navigate(input.sessionId, input.url);
    }),

  click: publicProcedure
    .input(z.object({ 
      sessionId: z.string(),
      x: z.number(),
      y: z.number()
    }))
    .mutation(async ({ input }) => {
      return await browserService.click(input.sessionId, input.x, input.y);
    }),

  scroll: publicProcedure
    .input(z.object({ 
      sessionId: z.string(),
      deltaY: z.number()
    }))
    .mutation(async ({ input }) => {
      return await browserService.scroll(input.sessionId, input.deltaY);
    }),

  type: publicProcedure
    .input(z.object({ 
      sessionId: z.string(),
      text: z.string()
    }))
    .mutation(async ({ input }) => {
      return await browserService.type(input.sessionId, input.text);
    }),

   pressKey: publicProcedure
    .input(z.object({ 
      sessionId: z.string(),
      key: z.string()
    }))
    .mutation(async ({ input }) => {
      // Cast to specific key type if we knew it, or just keep string if service accepts it
      return await browserService.pressKey(input.sessionId, input.key);
    }),

  goBack: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ input }) => {
      return await browserService.goBack(input.sessionId);
    }),

  goForward: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ input }) => {
      return await browserService.goForward(input.sessionId);
    }),

  closeSession: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ input }) => {
      await browserService.closeSession(input.sessionId);
      return { success: true };
    }),

  scrape: publicProcedure
    .input(z.object({ url: z.string().url() }))
    .mutation(async ({ input }) => {
       // 1. Fetch
       const response = await fetch(input.url, {
           headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
       });
       const html = await response.text();

       // 2. Parse (Lazy load to avoid heavy startup)
       const { JSDOM } = await import('jsdom');
       const { Readability } = await import('@mozilla/readability');
       const TurndownService = (await import('turndown')).default;

       const doc = new JSDOM(html, { url: input.url });
       const reader = new Readability(doc.window.document);
       const article = reader.parse();

       if (!article || !article.content) {
           throw new Error("Could not identify main content.");
       }

       // 3. Convert to Markdown for clean text with structure
       const turndown = new TurndownService();
       const markdown = turndown.turndown(article.content);

       return {
           title: article.title,
           content: markdown,
           excerpt: article.excerpt
       };
    }),

  extractMarkdown: publicProcedure
    .input(z.object({ url: z.string().url() }))
    .mutation(async ({ input }) => {
      const { fetchPageAsMarkdown } = await import('../tools/webScraper.js');
      const result = await fetchPageAsMarkdown({ url: input.url });
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to extract markdown',
        });
      }

      return {
        title: result.title,
        markdown: result.markdown,
        url: result.url
      };
    }),
});
