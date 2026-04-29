import puppeteer, { Browser, Page, KeyInput } from 'puppeteer';
import path from 'path';
import fs from 'fs/promises';

interface BrowserSession {
  browser: Browser;
  page: Page;
  lastActivity: number;
}

class BrowserService {
  private sessions: Map<string, BrowserSession> = new Map();
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  async getOrCreateSession(sessionId: string, sessionIdentityId?: string): Promise<BrowserSession> {
    const sessionKey = sessionIdentityId ? `${sessionId}_${sessionIdentityId}` : sessionId;
    let session = this.sessions.get(sessionKey);

    if (session) {
      session.lastActivity = Date.now();
      return session;
    }

    // Create new browser instance with isolated profile
    const userDataDir = path.join(process.cwd(), '.browser-data', sessionId);
    await fs.mkdir(userDataDir, { recursive: true });

    const browser = await puppeteer.launch({
      headless: true,
      userDataDir,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    session = {
      browser,
      page,
      lastActivity: Date.now()
    };

    this.sessions.set(sessionKey, session);
    
    // Auto-cleanup old sessions
    this.cleanupOldSessions();

    return session;
  }

  async navigate(sessionId: string, url: string) {
    const session = await this.getOrCreateSession(sessionId);
    
    try {
      await session.page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      const screenshot = await session.page.screenshot({ 
        encoding: 'base64',
        type: 'png'
      });

      const title = await session.page.title();
      const currentUrl = session.page.url();

      return {
        screenshot: `data:image/png;base64,${screenshot}`,
        title,
        url: currentUrl
      };
    } catch (error) {
      throw new Error(`Failed to navigate: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async click(sessionId: string, x: number, y: number) {
    const session = await this.getOrCreateSession(sessionId);
    
    try {
      await session.page.mouse.click(x, y);
      
      // Wait a bit for potential navigation
      await new Promise(resolve => setTimeout(resolve, 1000));

      const screenshot = await session.page.screenshot({ 
        encoding: 'base64',
        type: 'png'
      });

      const title = await session.page.title();
      const currentUrl = session.page.url();

      return {
        screenshot: `data:image/png;base64,${screenshot}`,
        title,
        url: currentUrl
      };
    } catch (error) {
      throw new Error(`Failed to click: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async scroll(sessionId: string, deltaY: number) {
    const session = await this.getOrCreateSession(sessionId);
    
    try {
      await session.page.evaluate((delta) => {
        window.scrollBy(0, delta);
      }, deltaY);

      await new Promise(resolve => setTimeout(resolve, 100));

      const screenshot = await session.page.screenshot({ 
        encoding: 'base64',
        type: 'png'
      });

      return {
        screenshot: `data:image/png;base64,${screenshot}`
      };
    } catch (error) {
      throw new Error(`Failed to scroll: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async type(sessionId: string, text: string) {
    const session = await this.getOrCreateSession(sessionId);
    
    try {
      // Type the text into the focused element
      await session.page.keyboard.type(text);

      await new Promise(resolve => setTimeout(resolve, 300));

      const screenshot = await session.page.screenshot({ 
        encoding: 'base64',
        type: 'png'
      });

      return {
        screenshot: `data:image/png;base64,${screenshot}`
      };
    } catch (error) {
      throw new Error(`Failed to type: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async pressKey(sessionId: string, key: string) {
    const session = await this.getOrCreateSession(sessionId);
    
    try {
      // Cast to KeyInput to satisfy Puppeteer's typing at runtime.
      await session.page.keyboard.press(key as KeyInput);

      await new Promise(resolve => setTimeout(resolve, 300));

      const screenshot = await session.page.screenshot({ 
        encoding: 'base64',
        type: 'png'
      });

      return {
        screenshot: `data:image/png;base64,${screenshot}`
      };
    } catch (error) {
      throw new Error(`Failed to press key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async goBack(sessionId: string) {
    const session = await this.getOrCreateSession(sessionId);
    
    try {
      await session.page.goBack({ waitUntil: 'networkidle2' });

      const screenshot = await session.page.screenshot({ 
        encoding: 'base64',
        type: 'png'
      });

      const title = await session.page.title();
      const currentUrl = session.page.url();

      return {
        screenshot: `data:image/png;base64,${screenshot}`,
        title,
        url: currentUrl
      };
    } catch (error) {
      throw new Error(`Failed to go back: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async goForward(sessionId: string) {
    const session = await this.getOrCreateSession(sessionId);
    
    try {
      await session.page.goForward({ waitUntil: 'networkidle2' });

      const screenshot = await session.page.screenshot({ 
        encoding: 'base64',
        type: 'png'
      });

      const title = await session.page.title();
      const currentUrl = session.page.url();

      return {
        screenshot: `data:image/png;base64,${screenshot}`,
        title,
        url: currentUrl
      };
    } catch (error) {
      throw new Error(`Failed to go forward: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async closeSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (session) {
      await session.browser.close();
      this.sessions.delete(sessionId);
    }
  }

  private cleanupOldSessions() {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastActivity > this.SESSION_TIMEOUT) {
        session.browser.close().catch(console.error);
        this.sessions.delete(sessionId);
      }
    }
  }
}

export const browserService = new BrowserService();
