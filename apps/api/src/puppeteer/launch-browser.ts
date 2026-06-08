import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { Browser, LaunchOptions, Page } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { applyStealthSettings, STEALTH_USER_AGENT } from './apply-stealth';

let stealthPluginRegistered = false;

function ensureStealthPlugin(): void {
  if (!stealthPluginRegistered) {
    puppeteer.use(StealthPlugin());
    stealthPluginRegistered = true;
  }
}

function buildLaunchArgs(): string[] {
  const args = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-blink-features=AutomationControlled',
    '--disable-features=IsolateOrigins,site-per-process',
    '--disable-extensions',
    '--disable-plugins-discovery',
    '--disable-infobars',
    '--ignore-certificate-errors',
    `--user-agent=${STEALTH_USER_AGENT}`,
  ];

  const debugPort = process.env['PUPPETEER_DEBUG_PORT'];
  if (debugPort) {
    args.push(`--remote-debugging-port=${debugPort}`);
  }

  return args;
}

function createUserDataDir(): string {
  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  return mkdtempSync(join(tmpdir(), `conductor_${suffix}_`));
}

export async function launchBrowser(
  options?: LaunchOptions
): Promise<Browser> {
  ensureStealthPlugin();

  const headless = process.env['PUPPETEER_HEADLESS'] !== 'false';
  const executablePath = process.env['PUPPETEER_EXECUTABLE_PATH'];

  return puppeteer.launch({
    headless,
    userDataDir: createUserDataDir(),
    ...(executablePath ? { executablePath } : {}),
    args: buildLaunchArgs(),
    defaultViewport: { width: 1280, height: 800 },
    ...options,
  });
}

export async function newStealthPage(browser: Browser): Promise<Page> {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await applyStealthSettings(page);
  return page;
}
