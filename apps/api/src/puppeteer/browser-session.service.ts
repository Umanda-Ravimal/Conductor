import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import type { Browser, Page } from 'puppeteer';
import { launchBrowser, newStealthPage } from './launch-browser';

export interface BrowserTabInfo {
  id: string;
  url: string;
  title: string;
  viewport: {
    width: number;
    height: number;
  };
}

@Injectable()
export class BrowserSessionService implements OnModuleDestroy {
  private readonly logger = new Logger(BrowserSessionService.name);
  private browser: Browser | null = null;
  private readonly tabs = new Map<string, Page>();

  async onModuleDestroy(): Promise<void> {
    await this.closeBrowser();
  }

  private async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await launchBrowser();
    }
    return this.browser;
  }

  async closeBrowser(): Promise<void> {
    try {
      const browser = this.browser;
      if (!browser) return;
      const pages = await browser.pages().catch(() => []);
      await Promise.all(pages.map((p) => p.close().catch(() => undefined)));
      await browser.close();
    } finally {
      this.browser = null;
      this.tabs.clear();
    }
  }

  async createTab(initialUrl: string): Promise<BrowserTabInfo> {
    const browser = await this.getBrowser();
    const page = await newStealthPage(browser);

    const tabId = `tab_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    this.tabs.set(tabId, page);

    if (initialUrl && initialUrl !== 'about:blank') {
      await this.navigateTab(tabId, initialUrl);
    }

    const viewport = page.viewport() ?? { width: 1280, height: 800 };
    const title = await page.title().catch(() => 'Tab');

    return {
      id: tabId,
      url: initialUrl,
      title,
      viewport: { width: viewport.width, height: viewport.height },
    };
  }

  private getPage(tabId: string): Page {
    const page = this.tabs.get(tabId);
    if (!page) {
      throw new Error(`Tab ${tabId} not found`);
    }
    if (page.isClosed()) {
      this.tabs.delete(tabId);
      throw new Error(`Tab ${tabId} is closed`);
    }
    return page;
  }

  async closeTab(tabId: string): Promise<void> {
    const page = this.tabs.get(tabId);
    if (!page) return;
    this.tabs.delete(tabId);
    await page.close().catch(() => undefined);
  }

  async navigateTab(tabId: string, url: string): Promise<void> {
    const page = this.getPage(tabId);
    const target = url.startsWith('http') ? url : `https://${url}`;

    try {
      await page.goto(target, { waitUntil: 'networkidle2', timeout: 60000 });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isTimeout =
        message.includes('timeout') ||
        (error instanceof Error && error.name === 'TimeoutError');
      if (!isTimeout) throw error;
      await page.goto(target, { waitUntil: 'load', timeout: 60000 });
    }
  }

  async waitForSelector(
    tabId: string,
    selector: string,
    timeoutMs = 10000
  ): Promise<void> {
    const page = this.getPage(tabId);
    await page.waitForSelector(selector, { timeout: timeoutMs });
  }

  async typeInto(
    tabId: string,
    selector: string,
    text: string,
    submit = false
  ): Promise<void> {
    const page = this.getPage(tabId);
    await page.waitForSelector(selector, { timeout: 20000 });
    await page.focus(selector);
    await page.keyboard.down('Control');
    await page.keyboard.press('A');
    await page.keyboard.up('Control');
    await page.keyboard.type(text, { delay: 20 });
    if (submit) {
      await page.keyboard.press('Enter');
    }
  }

  async click(tabId: string, selector: string): Promise<void> {
    const page = this.getPage(tabId);
    await page.waitForSelector(selector, { timeout: 20000 });
    await page.click(selector);
  }

  async scrollToBottomSmoothly(tabId: string): Promise<void> {
    const page = this.getPage(tabId);
    await page.evaluate(async () => {
      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
      const totalHeight = document.body.scrollHeight;
      const viewportHeight = window.innerHeight;
      const step = Math.max(100, Math.floor(viewportHeight * 0.2));
      for (let y = 0; y < totalHeight; y += step) {
        window.scrollTo({ top: y, behavior: 'smooth' });
        await sleep(200);
      }
      window.scrollTo({ top: totalHeight, behavior: 'smooth' });
    });
  }

  async scrollPage(tabId: string, scrollY: number): Promise<void> {
    const page = this.getPage(tabId);
    await page.evaluate((y) => window.scrollTo(0, y), scrollY);
  }

  async executeScript<T = unknown>(tabId: string, script: string): Promise<T> {
    const page = this.getPage(tabId);
    // script must evaluate to a function with no args.
    return page.evaluate((scriptContent) => {
      // eslint-disable-next-line no-new-func
      const fn = new Function(`return (${scriptContent})`)();
      return fn();
    }, script) as Promise<T>;
  }

  async getPageHTML(tabId: string): Promise<string> {
    const page = this.getPage(tabId);
    await page.waitForSelector('body', { timeout: 10000 }).catch(() => undefined);
    await new Promise((r) => setTimeout(r, 500));
    return page.content();
  }

  async validateSelectorInDOM(tabId: string, selector: string): Promise<{
    valid: boolean;
    elementCount: number;
    error?: string;
  }> {
    const page = this.getPage(tabId);
    return page.evaluate((sel) => {
      try {
        const els = document.querySelectorAll(sel);
        return { valid: true, elementCount: els.length as number };
      } catch (e) {
        return {
          valid: false,
          elementCount: 0,
          error: e instanceof Error ? e.message : String(e),
        };
      }
    }, selector);
  }

  async getTabScreenshotJpegB64(tabId: string): Promise<string> {
    const page = this.getPage(tabId);
    const buf = await page.screenshot({
      type: 'jpeg',
      quality: 60,
      fullPage: false,
    });
    return Buffer.from(buf).toString('base64');
  }

  async discoverRepeatingSelector(
    tabId: string,
    minCount = 3
  ): Promise<string | null> {
    const page = this.getPage(tabId);
    return page.evaluate((minimum) => {
      const signatures = new Map<
        string,
        { count: number; selector: string }
      >();

      for (const el of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
        if (el.closest('[data-conductor-highlight]')) continue;

        const rect = el.getBoundingClientRect();
        if (rect.width < 80 || rect.height < 24) continue;

        const tag = el.tagName.toLowerCase();
        const classes = Array.from(el.classList)
          .filter((c) => c.length > 1)
          .slice(0, 2);
        if (classes.length === 0) continue;

        const escaped = classes.map((c) => CSS.escape(c)).join('.');
        const selector = `${tag}.${escaped}`;
        const entry = signatures.get(selector) ?? { count: 0, selector };
        entry.count += 1;
        signatures.set(selector, entry);
      }

      let best: { count: number; selector: string } | null = null;
      for (const entry of signatures.values()) {
        if (entry.count < minimum) continue;
        if (entry.count > 60) continue;
        if (!best || entry.count > best.count) {
          best = entry;
        }
      }

      return best?.selector ?? null;
    }, minCount);
  }

  async highlightScrapedItem(
    tabId: string,
    searchTerms: string[],
    containerSelector?: string
  ): Promise<boolean> {
    if (searchTerms.length === 0) return false;

    const page = this.getPage(tabId);
    return page.evaluate(
      (terms, containerSel) => {
        const normalized = terms
          .map((t) => t.trim().toLowerCase())
          .filter((t) => t.length > 2);
        if (normalized.length === 0) return false;

        const candidates: HTMLElement[] = containerSel
          ? Array.from(document.querySelectorAll<HTMLElement>(containerSel))
          : Array.from(document.querySelectorAll<HTMLElement>('body *')).filter(
              (el) => {
                const rect = el.getBoundingClientRect();
                return rect.width >= 80 && rect.height >= 24;
              }
            );

        let best: HTMLElement | null = null;
        let bestScore = 0;

        for (const el of candidates) {
          if (el.hasAttribute('data-conductor-highlight')) continue;
          if (el.closest('[data-conductor-highlight]')) continue;

          const text = el.textContent?.trim().toLowerCase() ?? '';
          if (!text) continue;

          let score = 0;
          for (const term of normalized) {
            if (text.includes(term)) {
              score += term.length;
            }
          }
          if (score === 0) continue;

          // Prefer tighter containers so we highlight the card, not the whole page.
          score += Math.max(0, 400 - text.length) * 0.05;

          if (score > bestScore) {
            bestScore = score;
            best = el;
          }
        }

        if (!best) return false;

        if (!document.getElementById('conductor-highlight-styles')) {
          const style = document.createElement('style');
          style.id = 'conductor-highlight-styles';
          style.textContent = `
            @keyframes conductorPulse {
              0% { transform: scale(1); }
              50% { transform: scale(1.01); }
              100% { transform: scale(1); }
            }
            [data-conductor-highlight] {
              outline: 3px solid #A756F7 !important;
              outline-offset: 2px !important;
              border-radius: 6px !important;
              background: linear-gradient(
                90deg,
                rgba(168, 85, 247, 0.30) 0%,
                rgba(37, 99, 235, 0.30) 100%
              ) !important;
              box-shadow: 0 4px 16px rgba(167, 86, 247, 0.45) !important;
              animation: conductorPulse 1.2s ease-in-out infinite !important;
            }
          `;
          document.head.appendChild(style);
        }

        best.setAttribute('data-conductor-highlight', 'true');
        best.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return true;
      },
      searchTerms,
      containerSelector ?? ''
    );
  }

  async highlightElement(
    tabId: string,
    selector: string,
    elementIndex: number
  ): Promise<boolean> {
    const page = this.getPage(tabId);
    return page.evaluate(
      (sel, idx) => {
        const elements = document.querySelectorAll(sel);
        const el = elements[idx] as HTMLElement | undefined;
        if (!el) return false;

        if (!document.getElementById('conductor-highlight-styles')) {
          const style = document.createElement('style');
          style.id = 'conductor-highlight-styles';
          style.textContent = `
            @keyframes conductorPulse {
              0% { transform: scale(1); }
              50% { transform: scale(1.01); }
              100% { transform: scale(1); }
            }
            [data-conductor-highlight] {
              outline: 3px solid #A756F7 !important;
              outline-offset: 2px !important;
              border-radius: 6px !important;
              background: linear-gradient(
                90deg,
                rgba(168, 85, 247, 0.30) 0%,
                rgba(37, 99, 235, 0.30) 100%
              ) !important;
              box-shadow: 0 4px 16px rgba(167, 86, 247, 0.45) !important;
              animation: conductorPulse 1.2s ease-in-out infinite !important;
            }
          `;
          document.head.appendChild(style);
        }

        el.setAttribute('data-conductor-highlight', 'true');
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return true;
      },
      selector,
      elementIndex
    );
  }

  async highlightElementByText(tabId: string, text: string): Promise<boolean> {
    const page = this.getPage(tabId);
    return page.evaluate((searchText) => {
      const normalized = searchText.trim().toLowerCase().slice(0, 120);
      if (!normalized) return false;

      let best: HTMLElement | null = null;
      let bestLength = Infinity;

      for (const el of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
        const content = el.textContent?.trim().toLowerCase() ?? '';
        if (!content.includes(normalized)) continue;

        const rect = el.getBoundingClientRect();
        if (rect.width < 40 || rect.height < 16) continue;

        if (content.length < bestLength) {
          best = el;
          bestLength = content.length;
        }
      }

      if (!best) return false;

      if (!document.getElementById('conductor-highlight-styles')) {
        const style = document.createElement('style');
        style.id = 'conductor-highlight-styles';
        style.textContent = `
          @keyframes conductorPulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.01); }
            100% { transform: scale(1); }
          }
          [data-conductor-highlight] {
            outline: 3px solid #A756F7 !important;
            outline-offset: 2px !important;
            border-radius: 6px !important;
            background: linear-gradient(
              90deg,
              rgba(168, 85, 247, 0.30) 0%,
              rgba(37, 99, 235, 0.30) 100%
            ) !important;
            box-shadow: 0 4px 16px rgba(167, 86, 247, 0.45) !important;
            animation: conductorPulse 1.2s ease-in-out infinite !important;
          }
        `;
        document.head.appendChild(style);
      }

      best.setAttribute('data-conductor-highlight', 'true');
      best.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return true;
    }, text);
  }

  async removeHighlights(tabId: string): Promise<void> {
    const page = this.getPage(tabId);
    await page.evaluate(() => {
      for (const el of Array.from(
        document.querySelectorAll<HTMLElement>('[data-conductor-highlight]')
      )) {
        el.removeAttribute('data-conductor-highlight');
      }
    });
  }
}

