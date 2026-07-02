#!/usr/bin/env node

const baseUrl = process.env.PINGARDEN_SMOKE_BASE_URL || process.env.PINGARDEN_SERVER || 'http://localhost:4000';

function log(message) {
  process.stdout.write(`${message}\n`);
}

if (process.env.PINGARDEN_AI_AGENT_BRIDGE !== '1' || !process.env.PINGARDEN_AI_AGENT_BRIDGE_COMMAND) {
  log('AI agent bridge smoke skipped: set PINGARDEN_AI_AGENT_BRIDGE=1 and PINGARDEN_AI_AGENT_BRIDGE_COMMAND to run it.');
  process.exit(0);
}

const body = {
  apiKey: '',
  model: 'test-agent',
  provider: 'agent-bridge-ai',
  lang: 'zh',
  messages: [{ role: 'user', content: '请用一句话回复：PinGarden agent bridge smoke ok。' }],
};

const res = await fetch(`${baseUrl}/copilot/chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Display-Name': encodeURIComponent('AI Agent Bridge Smoke') },
  body: JSON.stringify(body),
});
if (!res.ok || !res.body) throw new Error(`/copilot/chat failed: HTTP ${res.status}`);

const reader = res.body.getReader();
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
log('✓ /copilot/chat produced at least one agent bridge delta');
