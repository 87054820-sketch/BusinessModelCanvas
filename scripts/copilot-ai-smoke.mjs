#!/usr/bin/env node

const baseUrl = process.env.PINGARDEN_SMOKE_BASE_URL || process.env.PINGARDEN_SERVER || 'http://localhost:4000';
const apiKey = process.env.PINGARDEN_SMOKE_AI_KEY || process.env.PINGARDEN_SMOKE_KIMI_API_KEY || process.env.PINGARDEN_SMOKE_DEEPSEEK_API_KEY;
const model = process.env.PINGARDEN_SMOKE_AI_MODEL;
const provider = process.env.PINGARDEN_SMOKE_AI_PROVIDER;

function log(message) {
  process.stdout.write(`${message}\n`);
}

if (!apiKey) {
  log('AI smoke skipped: set PINGARDEN_SMOKE_AI_KEY, PINGARDEN_SMOKE_KIMI_API_KEY, or PINGARDEN_SMOKE_DEEPSEEK_API_KEY to run a real provider check.');
  process.exit(0);
}

const selection = {
  ...(model ? { model } : {}),
  ...(provider ? { provider } : {}),
};

const testRes = await fetch(`${baseUrl}/copilot/test-key`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ apiKey, ...selection }),
});
if (!testRes.ok) throw new Error(`/copilot/test-key failed: HTTP ${testRes.status}`);
const testBody = await testRes.json();
if (!testBody.ok) throw new Error(`/copilot/test-key failed: ${testBody.message ?? 'unknown error'}`);
log('✓ /copilot/test-key ok');

const chatRes = await fetch(`${baseUrl}/copilot/chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Display-Name': encodeURIComponent('AI Smoke') },
  body: JSON.stringify({
    apiKey,
    ...selection,
    lang: 'zh',
    messages: [{ role: 'user', content: '请用一句话回复：PinGarden Copilot smoke ok。' }],
  }),
});
if (!chatRes.ok || !chatRes.body) throw new Error(`/copilot/chat failed: HTTP ${chatRes.status}`);

const reader = chatRes.body.getReader();
const decoder = new TextDecoder();
let text = '';
let sawDelta = false;
while (true) {
  const { value, done } = await reader.read();
  if (done) break;
  text += decoder.decode(value, { stream: true });
  if (/"delta"\s*:/.test(text)) {
    sawDelta = true;
    break;
  }
  if (/"error"\s*:/.test(text)) throw new Error(`/copilot/chat returned error frame: ${text.slice(0, 400)}`);
}

if (!sawDelta) throw new Error('/copilot/chat did not produce a delta frame');
log('✓ /copilot/chat produced at least one delta');
