import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

export const browserTools = {
  fetchPage: async ({ url }: { url: string }) => {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    const html = await res.text();
    const doc = new JSDOM(html, { url });
    const reader = new Readability(doc.window.document);
    const article = reader.parse();
    
    return {
      title: article?.title || doc.window.document.title,
      content: article?.textContent || "No content found",
      markdown: article?.textContent // Or convert HTML to Markdown here
    };
  }
};
