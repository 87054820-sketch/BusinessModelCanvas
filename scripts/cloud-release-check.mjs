#!/usr/bin/env node
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

const DEFAULT_URL = 'https://pingarden-274959-7-1259605451.sh.run.tcloudbase.com';
const base = parseBaseUrl(process.argv.slice(2)).replace(/\/+$/, '');

async function latestZip() {
  const dir = join(process.cwd(), 'apps/cli/build/skill');
  const files = (await readdir(dir)).filter((f) => /^pingarden-skill-.+\.zip$/.test(f)).sort();
  const filename = files.at(-1);
  if (!filename) return null;
  const s = await stat(join(dir, filename));
  return { filename, sizeBytes: s.size };
}

async function fetchJson(path) {
  const res = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(20000) });
  const text = await res.text();
  try {
    return { ok: res.ok, status: res.status, data: JSON.parse(text) };
  } catch {
    return { ok: res.ok, status: res.status, data: { raw: text.slice(0, 300) } };
  }
}

function check(name, pass, detail = '') {
  console.log(`${pass ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!pass) process.exitCode = 1;
}

const local = await latestZip();
const health = await fetchJson('/health');
const info = await fetchJson('/copilot/skill-pack/info');
const library = await fetchJson('/copilot/library-context?lang=zh&q=%E9%9D%9E%E5%AE%A2%E6%88%B7');
const resource = await fetchJson('/copilot/resource-context/blue-ocean-strategy?lang=zh&q=%E9%9D%9E%E5%AE%A2%E6%88%B7');

console.log(`Cloud release check: ${base}`);
console.log(`Local zip: ${local ? `${local.filename} (${local.sizeBytes})` : 'missing'}`);
check('health', health.ok && health.data?.ok === true, `HTTP ${health.status}`);
check('skill-pack info', info.ok, `HTTP ${info.status}; ${info.data?.filename ?? 'n/a'} (${info.data?.sizeBytes ?? 'n/a'})`);
if (local && info.ok) check('skill zip matches local', info.data?.filename === local.filename && info.data?.sizeBytes === local.sizeBytes);
check('library context has chapter hints', typeof library.data?.markdown === 'string' && /chapter\s+ch|章节|Chapter index/.test(library.data.markdown), `HTTP ${library.status}`);
check('resource-context route exists', resource.ok, `HTTP ${resource.status}`);

function parseBaseUrl(argv) {
  const args = argv.filter((arg) => arg !== '--');
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--url' && args[i + 1]) return args[i + 1];
    if (!args[i].startsWith('-')) return args[i];
  }
  return DEFAULT_URL;
}
