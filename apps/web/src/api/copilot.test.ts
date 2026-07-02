import { describe, expect, it } from 'vitest';
import { COPILOT_AUTH_REQUIRED, normalizeCopilotRuntimeError, __copilotApiTest } from './copilot';

describe('copilot API error normalization', () => {
  it('turns provider auth failures into a current-model key instruction', () => {
    expect(normalizeCopilotRuntimeError('provider.auth_error: 401 The API Key appears to be invalid')).toContain('当前模型保存的 API Key 无效或已过期');
  });

  it('turns OpenAI-compatible auth failures into a current-model key instruction', () => {
    expect(normalizeCopilotRuntimeError({ error: { message: 'invalid_authentication_error' } })).toContain('当前模型保存的 API Key 无效或已过期');
  });

  it('turns MiniMax 1004 auth failures into a key-type instruction', () => {
    const raw = {
      error: {
        type: 'authorized_error',
        message: "login fail: Please carry the API secret key in the 'Authorization' field of the request header (1004)",
      },
    };
    expect(
      normalizeCopilotRuntimeError(raw),
    ).toContain('MiniMax API Key 未通过认证');
    expect(__copilotApiTest.classifyCopilotProviderIssue(raw, 'minimax-http').kind).toBe('plan');
  });

  it('classifies quota and billing failures', () => {
    expect(
      __copilotApiTest.classifyCopilotProviderIssue('insufficient_quota: account credits exhausted', 'deepseek-http').kind,
    ).toBe('billing');
  });

  it('classifies model access and plan mismatches', () => {
    expect(
      __copilotApiTest.classifyCopilotProviderIssue('model MiniMax-M3 not available for this subscription key', 'minimax-http').kind,
    ).toBe('plan');
  });

  it('classifies rate-limit and network failures', () => {
    expect(__copilotApiTest.classifyCopilotProviderIssue('429 rate_limit_exceeded', 'kimi-http').kind).toBe('rate-limit');
    expect(__copilotApiTest.classifyCopilotProviderIssue('Failed to fetch', 'kimi-http').kind).toBe('network');
  });

  it('keeps Copilot auth-required responses machine-readable for the UI', () => {
    expect(__copilotApiTest.normalizeCopilotStreamError(401, JSON.stringify({ code: 'AUTH_REQUIRED', message: 'Please sign in to continue.' }))).toBe(COPILOT_AUTH_REQUIRED);
  });
});
