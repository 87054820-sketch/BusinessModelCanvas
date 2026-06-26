#!/usr/bin/env node

const DEFAULT_URL = 'https://pingarden-274959-7-1259605451.sh.run.tcloudbase.com';
const DEFAULT_RUNS = 3;
const DEFAULT_TIMEOUT_MS = 180_000;

const args = parseArgs(process.argv.slice(2));
const baseUrl = trimTrailingSlash(args.url ?? process.env.PINGARDEN_SMOKE_BASE_URL ?? DEFAULT_URL);
const runs = parsePositiveInt(args.runs ?? process.env.PINGARDEN_COPILOT_BENCHMARK_RUNS, DEFAULT_RUNS);
const timeoutMs = parsePositiveInt(args.timeoutMs ?? process.env.PINGARDEN_COPILOT_BENCHMARK_TIMEOUT_MS, DEFAULT_TIMEOUT_MS);
const apiKey = process.env.PINGARDEN_SMOKE_KIMI_API_KEY ?? process.env.PINGARDEN_COPILOT_BENCHMARK_KIMI_API_KEY;
const lang = args.lang === 'en' ? 'en' : 'zh';

if (!apiKey) {
  console.error('Missing API key. Set PINGARDEN_SMOKE_KIMI_API_KEY or PINGARDEN_COPILOT_BENCHMARK_KIMI_API_KEY.');
  process.exit(1);
}

const scenarios = [
  {
    name: 'no-context',
    question: lang === 'zh' ? '用三句话解释商业模式画布适合解决什么问题。' : 'Explain in three sentences what the Business Model Canvas is useful for.',
  },
  {
    name: 'library-context',
    question: lang === 'zh' ? '请解释蓝海战略，并推荐 PinGarden 策略库中一个相关案例。' : 'Explain Blue Ocean Strategy and recommend one relevant PinGarden library case.',
    contextQuery: lang === 'zh' ? '蓝海战略' : 'blue ocean strategy',
  },
  {
    name: 'long-conversation',
    question: lang === 'zh' ? '基于上面对话，总结三个战略假设和一个验证实验。' : 'Based on the prior discussion, summarize three strategy assumptions and one validation experiment.',
    prior: [
      { role: 'user', content: '我们正在评估一个面向中小企业的 AI 战略教练产品。' },
      { role: 'assistant', content: '可以先聚焦目标客户、关键痛点、可替代方案和付费触发点。' },
      { role: 'user', content: '用户希望快速学习 BMC、VPC、JTBD，并把案例套用到自己的项目。' },
      { role: 'assistant', content: '这类场景适合用模板化画布、案例迁移和小实验来降低学习门槛。' },
    ],
  },
];

if (args.projectId) {
  scenarios.push({
    name: 'project-context',
    question: lang === 'zh' ? '请基于当前项目找出最值得优化的一个商业模式假设。' : 'Find the most important business-model assumption to improve in this project.',
    projectId: args.projectId,
  });
}

const results = [];

for (const scenario of scenarios) {
  for (let i = 0; i < runs; i += 1) {
    const result = await runScenario(scenario, i + 1);
    results.push(result);
    printRun(result);
  }
}

printSummary(results);

async function runScenario(scenario, runIndex) {
  const attachedContext = await resolveContext(scenario);
  const messages = [
    ...(scenario.prior ?? []),
    { role: 'user', content: scenario.question },
  ];
  const startedAt = now();
  const res = await fetchWithTimeout(`${baseUrl}/copilot/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiKey,
      messages,
      ...(attachedContext ? { attachedContext } : {}),
      lang,
    }),
  });
  const requestId = res.headers.get('x-request-id') ?? undefined;
  const timings = {
    ttfbMs: round(now() - startedAt),
    firstFrameMs: undefined,
    ttftMs: undefined,
    totalMs: undefined,
  };
  const parsed = await readSse(res, startedAt, timings);
  return {
    scenario: scenario.name,
    run: runIndex,
    requestId: parsed.requestId ?? requestId,
    status: res.status,
    ok: res.ok && !parsed.error && parsed.sawDelta,
    chars: parsed.text.length,
    chunks: parsed.chunks,
    error: safeMessage(parsed.error ?? ''),
    ...timings,
    charsPerSec: timings.totalMs && parsed.text.length ? round(parsed.text.length / (timings.totalMs / 1000)) : 0,
    server: parsed.server,
    provider: parsed.provider,
  };
}

async function resolveContext(scenario) {
  if (scenario.contextQuery) {
    const json = await fetchJson(`/copilot/library-context?lang=${lang}&q=${encodeURIComponent(scenario.contextQuery)}`);
    return json.markdown;
  }
  if (scenario.projectId) {
    const json = await fetchJson(`/copilot/project-context/${encodeURIComponent(scenario.projectId)}?lang=${lang}`);
    return json.markdown;
  }
  return '';
}

async function readSse(res, startedAt, timings) {
  const contentType = res.headers.get('content-type') ?? '';
  if (!res.ok || !res.body || !contentType.includes('text/event-stream')) {
    return { error: `HTTP ${res.status}: ${safeMessage(await res.text())}`, text: '', chunks: 0, sawDelta: false };
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let text = '';
  let chunks = 0;
  let sawDelta = false;
  let error = '';
  let requestId;
  let server;
  let provider;

  while (!error) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const normalized = buffer.replace(/\r\n/g, '\n');
    const frames = normalized.split('\n\n');
    buffer = frames.pop() ?? '';
    for (const frame of frames) {
      if (timings.firstFrameMs === undefined) timings.firstFrameMs = round(now() - startedAt);
      for (const line of frame.split('\n')) {
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (!payload) continue;
        const parsed = JSON.parse(payload);
        if (typeof parsed.error === 'string') {
          error = parsed.error;
          requestId = parsed.requestId ?? requestId;
          break;
        }
        if (typeof parsed.delta === 'string') {
          if (!sawDelta) timings.ttftMs = round(now() - startedAt);
          sawDelta = true;
          chunks += 1;
          text += parsed.delta;
        }
        if (parsed.done === true) {
          timings.totalMs = round(now() - startedAt);
          requestId = parsed.requestId ?? requestId;
          server = parsed.timings;
          provider = parsed.providerTimings;
          return { text, chunks, sawDelta, requestId, server, provider, error };
        }
      }
    }
  }
  timings.totalMs = round(now() - startedAt);
  return { text, chunks, sawDelta, requestId, server, provider, error };
}

async function fetchJson(path) {
  const res = await fetchWithTimeout(`${baseUrl}${path}`);
  const text = await res.text();
  if (!res.ok) throw new Error(`${path} returned HTTP ${res.status}: ${safeMessage(text)}`);
  return JSON.parse(text);
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

function printRun(result) {
  const status = result.ok ? '✓' : '✗';
  console.log(`${status} ${result.scenario}#${result.run} requestId=${result.requestId ?? 'n/a'} ttfb=${result.ttfbMs}ms ttft=${result.ttftMs ?? 'n/a'}ms total=${result.totalMs ?? 'n/a'}ms chars=${result.chars} cps=${result.charsPerSec}${result.error ? ` error=${result.error}` : ''}`);
}

function printSummary(items) {
  console.log('\nCopilot latency benchmark summary');
  for (const name of [...new Set(items.map((item) => item.scenario))]) {
    const group = items.filter((item) => item.scenario === name && item.ok);
    if (group.length === 0) {
      console.log(`- ${name}: no successful runs`);
      continue;
    }
    console.log(`- ${name}: runs=${group.length} ttfb p50/p95=${p(group, 'ttfbMs', 50)}/${p(group, 'ttfbMs', 95)}ms ttft p50/p95=${p(group, 'ttftMs', 50)}/${p(group, 'ttftMs', 95)}ms total p50/p95=${p(group, 'totalMs', 50)}/${p(group, 'totalMs', 95)}ms cps p50=${p(group, 'charsPerSec', 50)}`);
  }
  console.log('\nRaw JSON');
  console.log(JSON.stringify(items.map(redactResult), null, 2));
}

function p(items, key, percentile) {
  const values = items.map((item) => item[key]).filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (values.length === 0) return 'n/a';
  const index = Math.min(values.length - 1, Math.ceil((percentile / 100) * values.length) - 1);
  return values[index];
}

function redactResult(result) {
  return { ...result, error: safeMessage(result.error ?? '') };
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--url') out.url = argv[++i];
    else if (arg === '--runs') out.runs = argv[++i];
    else if (arg === '--timeout-ms') out.timeoutMs = argv[++i];
    else if (arg === '--lang') out.lang = argv[++i];
    else if (arg === '--project-id') out.projectId = argv[++i];
    else if (arg === '--help' || arg === '-h') {
      console.log('Usage: pnpm benchmark:copilot -- --url <base-url> --runs 5 [--lang zh|en] [--project-id <id>]');
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

function now() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function round(value) {
  return Math.round(value);
}

function safeMessage(message) {
  return String(message)
    .replace(/Bearer\s+[A-Za-z0-9._-]+/g, 'Bearer [redacted]')
    .replace(/sk-[A-Za-z0-9._-]+/g, 'sk-[redacted]')
    .slice(0, 600);
}
