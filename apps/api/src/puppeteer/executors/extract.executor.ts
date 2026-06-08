import { Page } from 'puppeteer';

export async function extractExecutor(
  page: Page,
  selector: string
): Promise<string[]> {
  return page.evaluate((sel) => {
    const elements = Array.from(document.querySelectorAll(sel));
    return elements
      .map((el) => el.textContent?.trim() ?? '')
      .filter((text) => text.length > 0);
  }, selector);
}
