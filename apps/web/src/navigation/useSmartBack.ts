import { useCallback } from 'react';
import {
  useLocation,
  useNavigate,
} from 'react-router-dom';

export interface NavigationState {
  from?: string;
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
  return {
    ...state,
    from,
  };
}

export function preserveNavigationState(location: AppLocationLike): NavigationState | undefined {
  return isNavigationState(location.state) ? { ...location.state } : undefined;
}

export function useSmartBack(fallback: string) {
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(() => {
    const current = currentPathFromLocation(location);
    const from = isNavigationState(location.state) ? safeAppPath(location.state.from) : undefined;
    if (from && from !== current) {
      navigate(from);
      return;
    }

    const historyIndex = typeof window !== 'undefined'
      ? Number((window.history.state as { idx?: unknown } | null)?.idx ?? 0)
      : 0;
    if (historyIndex > 0) {
      navigate(-1);
      return;
    }

    navigate(fallback);
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
