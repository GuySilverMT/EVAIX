import { chromium } from 'playwright';
import * as cheerio from 'cheerio';
// @ts-ignore
import TurndownService from 'turndown';

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
});

export async function fetchPageAsMarkdown(args: { url: string, timeoutMs?: number }) {
  const { url, timeoutMs = 30000 } = args;
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: timeoutMs });
    const html = await page.content();
    
    const $ = cheerio.load(html);
    
    // Remove junk elements
    $('script, style, nav, footer, iframe, noscript, header, aside, .ads, .sidebar, .menu, .nav').remove();
    
    const title = $('title').first().text() || '';
    
    // Attempt to extract main content
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
      markdown, 
      text, 
      html: cleanHtml 
    };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  } finally {
    try { await browser.close(); } catch (_) {}
  }
}

// Tool wrapper compatible with AgentRuntime native tool registration
export const webScraperTool = {
  name: 'research.web_scrape',
  description: 'Fetch a URL and return extracted content as markdown and text',
  handler: async (args: { url: string }) => {
    return await fetchPageAsMarkdown(args as any);
  },
  input_schema: {
    type: 'object',
    properties: { url: { type: 'string' } },
    required: ['url']
  }
};
