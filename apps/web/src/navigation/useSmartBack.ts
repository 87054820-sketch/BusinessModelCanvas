import { useCallback } from 'react';
import {
  useLocation,
  useNavigate,
} from 'react-router-dom';

export interface NavigationState {
  from?: string;
  backStack?: string[];
  [key: string]: unknown;
}

interface AppLocationLike {
  pathname: string;
  search: string;
  hash: string;
  state?: unknown;
}

export function currentPathFromLocation(location: AppLocationLike): string {
  return `${location.pathname}${location.search}${location.hash}`;
}

export function stateWithFrom(
  location: AppLocationLike,
  from: string = currentPathFromLocation(location),
): NavigationState {
  const state = isNavigationState(location.state) ? location.state : {};
  const previousStack = readBackStack(state);
  const previousFrom = safeAppPath(state.from);
  const backStack = pushBackTarget(
    previousStack.length > 0 ? previousStack : previousFrom ? [previousFrom] : [],
    from,
  );
  return {
    ...state,
    from: backStack[backStack.length - 1] ?? from,
    backStack,
  };
}

export function preserveNavigationState(location: AppLocationLike): NavigationState | undefined {
  return isNavigationState(location.state) ? { ...location.state } : undefined;
}

export function resolveSmartBack(
  location: AppLocationLike,
  fallback: string,
): { to: string; state?: NavigationState } {
  const current = currentPathFromLocation(location);
  const state = isNavigationState(location.state) ? location.state : {};
  const legacyFrom = safeAppPath(state.from);
  const stack = readBackStack(state);
  const candidates = stack.length > 0 ? [...stack] : legacyFrom ? [legacyFrom] : [];

  while (candidates.length > 0 && candidates[candidates.length - 1] === current) {
    candidates.pop();
  }

  const target = candidates.pop();
  if (target) {
    return {
      to: target,
      state: navigationStateFromStack(candidates),
    };
  }

  return {
    to: safeAppPath(fallback) ?? '/',
  };
}

export function useSmartBack(fallback: string) {
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(() => {
    const next = resolveSmartBack(location, fallback);
    navigate(next.to, { replace: true, state: next.state });
  }, [fallback, location, navigate]);
}

function isNavigationState(value: unknown): value is NavigationState {
  return !!value && typeof value === 'object';
}

function safeAppPath(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  if (!value.startsWith('/') || value.startsWith('//')) return undefined;
  return value;
}

function readBackStack(state: NavigationState): string[] {
  if (!Array.isArray(state.backStack)) return [];
  return state.backStack
    .map((item) => safeAppPath(item))
    .filter((item): item is string => Boolean(item));
}

function pushBackTarget(stack: string[], target: string): string[] {
  const safeTarget = safeAppPath(target);
  if (!safeTarget) return stack;
  const next = [...stack];
  if (next[next.length - 1] !== safeTarget) next.push(safeTarget);
  return next;
}

function navigationStateFromStack(stack: string[]): NavigationState | undefined {
  if (stack.length === 0) return undefined;
  return {
    from: stack[stack.length - 1],
    backStack: stack,
  };
}
