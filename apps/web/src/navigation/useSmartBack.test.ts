import { describe, expect, it } from 'vitest';
import { resolveSmartBack, stateWithFrom } from './useSmartBack';

function location(pathname: string, state?: unknown) {
  return {
    pathname,
    search: '',
    hash: '',
    state,
  };
}

describe('smart back navigation', () => {
  it('pops a multi-level app back stack without bouncing between the last two pages', () => {
    const libraryState = stateWithFrom(location('/'));
    const caseState = stateWithFrom(location('/library', libraryState));

    const firstBack = resolveSmartBack(location('/p/case-1', caseState), '/library');
    expect(firstBack).toEqual({
      to: '/library',
      state: {
        from: '/',
        backStack: ['/'],
      },
    });

    const secondBack = resolveSmartBack(location('/library', firstBack.state), '/');
    expect(secondBack).toEqual({ to: '/' });
  });

  it('falls back safely for legacy one-level from state', () => {
    const firstBack = resolveSmartBack(location('/p/case-1', { from: '/library' }), '/library');
    expect(firstBack).toEqual({ to: '/library' });

    const secondBack = resolveSmartBack(location('/library'), '/');
    expect(secondBack).toEqual({ to: '/' });
  });

  it('skips a current-page duplicate at the top of the stack', () => {
    const next = resolveSmartBack(
      location('/library', { from: '/library', backStack: ['/', '/library'] }),
      '/',
    );

    expect(next).toEqual({ to: '/' });
  });
});
