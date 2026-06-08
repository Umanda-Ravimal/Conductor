import { Page } from 'puppeteer';

export async function assertNotGoogleBlocked(page: Page): Promise<void> {
  const blocked = await page.evaluate(() => {
    const text = document.body?.innerText ?? '';
    const title = document.title.toLowerCase();
    const href = window.location.href;
    return (
      text.includes('unusual traffic') ||
      text.includes('not a robot') ||
      title.includes('sorry') ||
      href.includes('/sorry/')
    );
  });

  if (blocked) {
    throw new Error(
      'Google blocked automated search (CAPTCHA). Try again later or use a search API.'
    );
  }
}
