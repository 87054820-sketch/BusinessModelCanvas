#!/usr/bin/env node

import { execFileSync } from 'node:child_process';

const DEFAULT_URL = 'https://pingarden-274959-7-1259605451.sh.run.tcloudbase.com';
const args = parseArgs(process.argv.slice(2));
const baseUrl = trimTrailingSlash(args.url ?? process.env.PINGARDEN_SMOKE_BASE_URL ?? DEFAULT_URL);
const session = `pgm${Date.now().toString(36)}`;
const cli = findPlaywrightCli();

try {
  runCli(['-s', session, 'open', `${baseUrl}/library`]);
  runCli(['-s', session, 'resize', '390', '844']);
  runCli(['-s', session, 'run-code', mobileAssertions()]);
  console.log(`✓ mobile-ui-smoke passed (${baseUrl})`);
} finally {
  try {
    runCli([`-s=${session}`, 'close']);
  } catch {
    // best effort
  }
}

function mobileAssertions() {
  const libraryUrl = `${baseUrl}/library`;
  return `async page => {
    await page.evaluate(() => localStorage.setItem('pingarden.identity', JSON.stringify({ displayName: 'Mobile Smoke', clientId: 'mobile-smoke', color: '#10B981' })));
    await page.goto(${JSON.stringify(libraryUrl)});
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    const h1 = page.locator('h1').filter({ hasText: /策略库|Strategy Library/ }).first();
    await h1.waitFor({ timeout: 15000 });
    const h1Box = await h1.boundingBox();
    if (!h1Box || h1Box.width < 80) throw new Error('Library title is too narrow; mobile layout may be vertically wrapping CJK text');

    const tabs = page.locator('[role="tablist"] [role="tab"]');
    const tabCount = await tabs.count();
    if (tabCount < 5) throw new Error('Expected strategy library tabs on mobile');
    for (let i = 0; i < tabCount; i += 1) {
      const box = await tabs.nth(i).boundingBox();
      if (!box || box.width < 36 || box.height > 56) throw new Error('A mobile tab is compressed or wrapped vertically');
    }

    const copilotButton = page.getByRole('button', { name: /PinGarden Copilot/ }).first();
    await copilotButton.click();
    const drawer = page.getByRole('complementary', { name: /PinGarden Copilot/ });
    await drawer.waitFor({ timeout: 10000 });
    const drawerBox = await drawer.boundingBox();
    if (!drawerBox || drawerBox.width < 360 || drawerBox.height < 700) throw new Error('Copilot drawer is not using mobile full-screen layout');

    await page.getByRole('button', { name: /\\+ 图片|\\+ Image/ }).waitFor({ timeout: 10000 });
    const bodyText = await page.locator('body').innerText();
    if (/出错了:\\s*Load failed|Error:\\s*Load failed/.test(bodyText)) throw new Error('Raw Load failed is visible to users');
  }`;
}

function runCli(argv) {
  const output = execFileSync(cli, argv, { encoding: 'utf8' });
  process.stdout.write(output);
  if (/### Error/.test(output)) throw new Error(output.split('### Error').pop()?.trim() || 'playwright-cli command failed');
}

function findPlaywrightCli() {
  const found = execFileSync('sh', ['-lc', 'command -v playwright-cli || true'], { encoding: 'utf8' }).trim();
  if (found) return found;
  throw new Error('playwright-cli not found. Install with: npm install -g @playwright/cli@latest');
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--url') out.url = argv[++i];
    else if (arg === '--help' || arg === '-h') {
      console.log('Usage: pnpm smoke:mobile -- --url <base-url>');
      process.exit(0);
    }
  }
  return out;
}

function trimTrailingSlash(input) {
  return input.replace(/\/+$/, '');
}
