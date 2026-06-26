#!/usr/bin/env node

const DEFAULT_URL = 'https://pingarden-274959-7-1259605451.sh.run.tcloudbase.com';
const DEFAULT_TIMEOUT_MS = 20_000;
const INVALID_KEY = 'sk-pingarden-smoke-invalid-key';

const args = parseArgs(process.argv.slice(2));
const baseUrl = trimTrailingSlash(args.url ?? process.env.PINGARDEN_SMOKE_BASE_URL ?? DEFAULT_URL);
const timeoutMs = parsePositiveInt(args.timeoutMs ?? process.env.PINGARDEN_SMOKE_TIMEOUT_MS, DEFAULT_TIMEOUT_MS);
const realKimi = args.realKimi === true;
const realKimiKey = process.env.PINGARDEN_SMOKE_KIMI_API_KEY;
const realKimiQuestion = args.realKimiQuestion ?? process.env.PINGARDEN_SMOKE_KIMI_QUESTION ?? '请用两句话解释蓝海战略，并给出一个 PinGarden 策略库里的真实案例。';

const results = [];

async function main() {
  await run('cloud-health', async () => {
    const json = await fetchJson('/health');
    assert(json.ok === true, `Expected /health ok=true, got ${JSON.stringify(json)}`);
  });

  await run('cloud-copilot-health', async () => {
    const json = await fetchJson('/copilot/health');
    assert(json.provider?.provider === 'kimi-http', `Expected provider kimi-http, got ${JSON.stringify(json.provider)}`);
    assert(json.provider?.available === true, 'Expected Copilot provider available=true');
    assert(json.provider?.storesKeyServerSide === false, 'Expected storesKeyServerSide=false');
  });

  await run('cloud-home-html', async () => {
    const html = await fetchText('/');
    assert(!isHtmlGatewayError(html), 'Home page returned gateway error HTML');
    assert(html.includes('PinGarden'), 'Home page does not contain PinGarden title');
    const assets = extractAssets(html);
    assert(assets.length > 0, 'Home page does not reference JS/CSS assets');
  });

  await run('cloud-static-assets', async () => {
    const html = await fetchText('/');
    const assets = extractAssets(html);
    assert(assets.length > 0, 'No assets found in home page');
    for (const asset of assets) {
      const res = await fetchWithTimeout(new URL(asset, `${baseUrl}/`).toString(), { method: 'GET' });
      assert(res.ok, `Asset ${asset} returned HTTP ${res.status}`);
      await res.arrayBuffer();
    }
  });

  await run('cloud-dynamic-chunks', async () => {
    const html = await fetchText('/');
    const entryAssets = extractAssets(html).filter((asset) => asset.endsWith('.js'));
    const dynamicAssets = new Set();
    for (const asset of entryAssets) {
      const js = await fetchText(asset.startsWith('/') ? asset : `/${asset}`);
      for (const dynamicAsset of extractDynamicAssets(js)) dynamicAssets.add(dynamicAsset);
    }
    assert(dynamicAssets.size > 0, 'No dynamic chunks found in entry assets');
    for (const asset of dynamicAssets) {
      const text = await fetchText(asset.startsWith('/') ? asset : `/${asset}`);
      assert(!/^<!doctype\s+html/i.test(text.trim()) && !/^<html[\s>]/i.test(text.trim()), `Dynamic chunk ${asset} returned HTML`);
    }
  });

  await run('cloud-library-context-filter', async () => {
    const json = await fetchJson('/copilot/library-context?lang=zh&q=%E8%93%9D%E6%B5%B7%E6%88%98%E7%95%A5');
    const markdown = json.markdown ?? '';
    assert(markdown.includes('Filtered for user question'), 'Library context is not query-filtered');
    assert(markdown.includes('蓝海') || markdown.includes('blue-ocean'), 'Filtered library context does not include Blue Ocean references');
    assert(markdown.length < 15_000, `Filtered library context is too large: ${markdown.length} chars`);
  });

  await run('cloud-chat-sse-invalid-key', async () => {
    const body = await fetchSseHead('/copilot/chat', {
      apiKey: INVALID_KEY,
      messages: [{ role: 'user', content: 'ping' }],
      lang: 'zh',
    });
    assert(!isHtmlGatewayError(body), `Chat returned gateway HTML: ${body.slice(0, 120)}`);
    assert(body.includes('data:') || body.includes(': stream-open'), `Expected SSE frame, got: ${body.slice(0, 160)}`);
    assert(!body.includes(INVALID_KEY), 'Response leaked the request API key');
  });

  if (realKimi) {
    await run('cloud-real-kimi-test-key', async () => {
      assert(Boolean(realKimiKey), 'PINGARDEN_SMOKE_KIMI_API_KEY is required when --real-kimi is used');
      const json = await fetchJson('/copilot/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: realKimiKey }),
      });
      assert(json.ok === true, `Real Kimi probe failed: ${safeMessage(json.message ?? JSON.stringify(json))}`);
    });

    await run('cloud-real-kimi-library-chat', async () => {
      assert(Boolean(realKimiKey), 'PINGARDEN_SMOKE_KIMI_API_KEY is required when --real-kimi is used');
      const context = await fetchJson(`/copilot/library-context?lang=zh&q=${encodeURIComponent(realKimiQuestion)}`);
      const result = await fetchSseUntilTerminal('/copilot/chat', {
        apiKey: realKimiKey,
        messages: [{ role: 'user', content: realKimiQuestion }],
        attachedContext: context.markdown,
        lang: 'zh',
      });
      assert(result.sawDelta, `Expected at least one Kimi delta, got ${JSON.stringify(result)}`);
      assert(!result.error, `Real Kimi library chat returned error: ${safeMessage(result.error ?? '')}`);
      assert(!result.text.includes(realKimiKey), 'Response leaked the real API key');
    });
  }

  printSummary();
  const failed = results.filter((item) => item.status === 'failed');
  process.exit(failed.length > 0 ? 1 : 0);
}

async function run(name, fn) {
  const started = Date.now();
  try {
    await fn();
    results.push({ name, status: 'passed', ms: Date.now() - started });
    console.log(`✓ ${name}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    results.push({ name, status: 'failed', ms: Date.now() - started, message: safeMessage(message) });
    console.error(`✗ ${name}: ${safeMessage(message)}`);
  }
}

async function fetchJson(path, init) {
  const res = await fetchWithTimeout(`${baseUrl}${path}`, init);
  const text = await res.text();
  assert(res.ok, `${path} returned HTTP ${res.status}: ${safeMessage(text.slice(0, 300))}`);
  assert(!isHtmlGatewayError(text), `${path} returned gateway HTML`);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${path} did not return JSON: ${text.slice(0, 160)}`);
  }
}

async function fetchText(path, init) {
  const res = await fetchWithTimeout(`${baseUrl}${path}`, init);
  const text = await res.text();
  assert(res.ok, `${path} returned HTTP ${res.status}: ${safeMessage(text.slice(0, 300))}`);
  return text;
}

async function fetchSseHead(path, jsonBody) {
  const res = await fetchWithTimeout(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(jsonBody),
  });
  const contentType = res.headers.get('content-type') ?? '';
  const text = await readResponseHead(res, 2048);
  assert(res.ok, `${path} returned HTTP ${res.status}: ${safeMessage(text.slice(0, 300))}`);
  assert(contentType.includes('text/event-stream'), `${path} did not return text/event-stream, got ${contentType}`);
  return text;
}

async function fetchSseUntilTerminal(path, jsonBody) {
  const res = await fetchWithTimeout(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(jsonBody),
  });
  const contentType = res.headers.get('content-type') ?? '';
  assert(res.ok, `${path} returned HTTP ${res.status}`);
  assert(contentType.includes('text/event-stream'), `${path} did not return text/event-stream, got ${contentType}`);
  if (!res.body) return { sawDelta: false, done: false, error: 'Missing response body', text: '' };

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let text = '';
  let sawDelta = false;
  let done = false;
  let error = '';

  try {
    while (!done && !error && text.length < 20_000) {
      const { value, done: streamDone } = await reader.read();
      if (streamDone) break;
      buffer += decoder.decode(value, { stream: true });
      const normalised = buffer.replace(/\r\n/g, '\n');
      const frames = normalised.split('\n\n');
      buffer = frames.pop() ?? '';
      for (const frame of frames) {
        for (const line of frame.split('\n')) {
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (!payload) continue;
          const parsed = JSON.parse(payload);
          if (typeof parsed.delta === 'string') {
            sawDelta = true;
            text += parsed.delta;
          }
          if (typeof parsed.error === 'string') error = parsed.error;
          if (parsed.done === true) done = true;
        }
      }
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
      // best effort
    }
  }

  return { sawDelta, done, error, text: safeMessage(text) };
}

async function fetchWithTimeout(url, init) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function readResponseHead(res, maxChars) {
  if (!res.body) return await res.text();
  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let out = '';
  while (out.length < maxChars) {
    const { value, done } = await reader.read();
    if (done) break;
    out += decoder.decode(value, { stream: true });
    if (out.includes('\n\n')) break;
  }
  try {
    await reader.cancel();
  } catch {
    // best effort
  }
  return out;
}

function extractAssets(html) {
  const assets = new Set();
  const re = /(?:src|href)="([^"]+\.(?:js|css))"/g;
  let match;
  while ((match = re.exec(html))) assets.add(match[1]);
  return [...assets];
}

function extractDynamicAssets(js) {
  const assets = new Set();
  const re = /assets\/[^"'`\\]+\.js/g;
  let match;
  while ((match = re.exec(js))) assets.add(`/${match[0]}`);
  return [...assets];
}

function isHtmlGatewayError(text) {
  return /<html[\s>]/i.test(text) && /(504\s+Gateway\s+Time-?out|502\s+Bad\s+Gateway|nginx)/i.test(text);
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--url') out.url = argv[++i];
    else if (arg === '--timeout-ms') out.timeoutMs = argv[++i];
    else if (arg === '--real-kimi') out.realKimi = true;
    else if (arg === '--real-kimi-question') out.realKimiQuestion = argv[++i];
    else if (arg === '--help' || arg === '-h') {
      console.log('Usage: pnpm smoke:cloud -- --url <base-url> [--real-kimi] [--real-kimi-question <text>] [--timeout-ms 20000]');
      process.exit(0);
    }
  }
  return out;
}

function parsePositiveInt(raw, fallback) {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function trimTrailingSlash(input) {
  return input.replace(/\/+$/, '');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function safeMessage(message) {
  return String(message)
    .replace(/Bearer\s+[A-Za-z0-9._-]+/g, 'Bearer [redacted]')
    .replace(/sk-[A-Za-z0-9._-]+/g, 'sk-[redacted]')
    .slice(0, 600);
}

function printSummary() {
  const passed = results.filter((item) => item.status === 'passed').length;
  const failed = results.length - passed;
  console.log(`\nCloud smoke summary: ${passed} passed, ${failed} failed (${baseUrl})`);
  for (const item of results) {
    const suffix = item.status === 'failed' ? ` — ${item.message}` : '';
    console.log(`- ${item.status.toUpperCase()} ${item.name} ${item.ms}ms${suffix}`);
  }
}

void main().catch((err) => {
  console.error(safeMessage(err instanceof Error ? err.message : String(err)));
  process.exit(1);
});
