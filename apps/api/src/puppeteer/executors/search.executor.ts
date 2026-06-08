import { Page } from 'puppeteer';
import { assertNotGoogleBlocked } from './google-block';
import { navigateExecutor } from './navigate.executor';

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export async function searchExecutor(
  page: Page,
  query: string
): Promise<SearchResult[]> {
  const encoded = encodeURIComponent(query);
  await navigateExecutor(
    page,
    `https://www.google.com/search?q=${encoded}`
  );
  await assertNotGoogleBlocked(page);

  return page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll('div.g'));
    return nodes.slice(0, 5).map((node) => {
      const titleEl = node.querySelector('h3');
      const linkEl = node.querySelector<HTMLAnchorElement>('a');
      const snippetEl = node.querySelector(
        'div[data-sncf], div.VwiC3b, span.st'
      );
      return {
        title: titleEl?.textContent?.trim() ?? 'Untitled',
        url: linkEl?.href ?? '',
        snippet: snippetEl?.textContent?.trim() ?? '',
      };
    });
  });
}
