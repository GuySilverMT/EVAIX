import { createTool } from '@mastra/core/tools';
import { chromium } from 'playwright';
import * as cheerio from 'cheerio';
// @ts-ignore
import TurndownService from 'turndown';
import axios from 'axios';
import { z } from 'zod';

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
});

// 1. DuckDuckGo / Yahoo Web Search Tool (Free, keyless, robust)
export const webSearchTool = createTool({
  id: 'web_search',
  description: 'Search the web for a query and return top results with titles, URLs, and snippets.',
  inputSchema: z.object({
    query: z.string().describe('The search query, e.g. "latest news on TypeScript"')
  }),
  execute: async ({ query }) => {
    try {
      const response = await axios.get(`https://search.yahoo.com/search?p=${encodeURIComponent(query)}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      const results: any[] = [];

      $('h3.title').each((i, el) => {
        const title = $(el).text().trim();
        const parent = $(el).parent();
        
        let url = '';
        if (parent.prop('tagName') === 'A') {
          url = parent.attr('href') || '';
        } else {
          url = $(el).find('a').attr('href') || parent.find('a').attr('href') || '';
        }

        // Decode Yahoo redirect URL to get direct link
        if (url) {
          const match = url.match(/[?&]RU=([^&]+)/);
          if (match && match[1]) {
            url = decodeURIComponent(match[1]);
          }
        }

        const container = $(el).closest('.algo') || $(el).closest('li') || $(el).parent().parent();
        const snippet = container.find('.compText').text().trim() || 
                        container.find('.compText, .snippet, p').first().text().trim() || 
                        '';

        if (title && url && url.startsWith('http')) {
          results.push({ title, url, snippet });
        }
      });

      return { success: true, results: results.slice(0, 10) };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
});

// 2. Playwright Web Scrape Tool (converts page to clean Markdown)
export const webScrapeTool = createTool({
  id: 'web_scrape',
  description: 'Scrape the full content of a web page URL and convert it to clean Markdown.',
  inputSchema: z.object({
    url: z.string().describe('The URL of the page to scrape, e.g. "https://mastra.ai/docs"')
  }),
  execute: async ({ url }) => {
    const browser = await chromium.launch({ headless: true });
    try {
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });
      const page = await context.newPage();
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      const html = await page.content();
      
      const $ = cheerio.load(html);
      
      // Remove noise elements
      $('script, style, nav, footer, iframe, noscript, header, aside, .ads, .sidebar, .menu, .nav').remove();
      
      const title = $('title').first().text() || '';
      
      let contentElement = $('article').first();
      if (contentElement.length === 0) contentElement = $('main').first();
      if (contentElement.length === 0) contentElement = $('#content, .content, #main, .main').first();
      if (contentElement.length === 0) contentElement = $('body');

      const cleanHtml = contentElement.html() || '';
      const markdown = turndown.turndown(cleanHtml);
      const text = contentElement.text().replace(/\s+/g, ' ').trim();

      return { 
        success: true, 
        url, 
        title, 
        markdown: markdown || text || "No text content extracted"
      };
    } catch (err: any) {
      return { success: false, error: err?.message || String(err) };
    } finally {
      await browser.close();
    }
  }
});
