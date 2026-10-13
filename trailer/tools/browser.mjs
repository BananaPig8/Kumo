import path from 'node:path';
import { chromium } from 'playwright';
import { serve } from './server.mjs';

export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

// Chromium sin GPU: WebGL por software (SwiftShader).
export async function openTrailer({ width = 1920, height = 1080, query = '' } = {}) {
  const { server, port } = await serve(ROOT);
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
  });
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${port}/?capture${query}`);
  try {
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 600000, polling: 500 });
  } catch (e) {
    console.error(errors.join('\n'));
    throw e;
  }
  return { browser, page, server, errors, close: async () => { await browser.close(); server.close(); } };
}
