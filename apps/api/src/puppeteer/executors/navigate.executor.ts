import { Page } from 'puppeteer';

export async function navigateExecutor(
  page: Page,
  url: string
): Promise<void> {
  const target = url.startsWith('http') ? url : `https://${url}`;

  try {
    await page.goto(target, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isTimeout =
      message.includes('timeout') ||
      (error instanceof Error && error.name === 'TimeoutError');

    if (!isTimeout) {
      throw error;
    }

    await page.goto(target, {
      waitUntil: 'load',
      timeout: 60000,
    });
  }
}
