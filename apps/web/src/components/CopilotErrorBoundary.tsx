import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Optional label shown above the error message. */
  label?: string;
}

interface State {
  error: Error | null;
  info: ErrorInfo | null;
}

const CHUNK_RELOAD_ATTEMPT_KEY = 'pingarden.chunkReloadAttempt.v1';

/**
 * Catches render-time exceptions in a subtree and surfaces them in-place
 * instead of unmounting the whole React tree (which is what causes the
 * "blank page" symptom). Use this around any optional feature surface
 * — the Copilot drawer is the canonical example — so a bug in the
 * subtree doesn't blank out the entire app.
 */
export class CopilotErrorBoundary extends Component<Props, State> {
  override state: State = { error: null, info: null };

  private chunkReloadClearTimer: number | null = null;

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  override componentDidMount(): void {
    this.chunkReloadClearTimer = window.setTimeout(() => {
      if (!this.state.error) {
        window.sessionStorage.removeItem(CHUNK_RELOAD_ATTEMPT_KEY);
      }
    }, 3000);
  }

  override componentWillUnmount(): void {
    if (this.chunkReloadClearTimer !== null) {
      window.clearTimeout(this.chunkReloadClearTimer);
    }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    this.setState({ error, info });
    // eslint-disable-next-line no-console
    console.error('CopilotErrorBoundary caught:', error, info);
    if (isChunkLoadError(error) && shouldAutoReloadChunkError()) {
      window.location.reload();
    }
  }

  override render() {
    if (this.state.error) {
      const chunkLoad = isChunkLoadError(this.state.error);
      return (
        <div
          role="alert"
          className="m-4 flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-[12px] text-red-900 shadow-lg"
        >
          <h2 className="text-sm font-semibold">
            {chunkLoad ? '应用资源已更新，请刷新页面' : (this.props.label ?? 'Copilot crashed')}
          </h2>
          <p className="font-medium leading-relaxed">
            {chunkLoad
              ? '云端刚发布新版本时，浏览器可能还在使用旧的资源引用。刷新后会重新加载最新页面。'
              : this.state.error.message}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-md bg-red-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-800"
            >
              刷新页面
            </button>
            <button
              type="button"
              onClick={() => this.setState({ error: null, info: null })}
              className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
            >
              关闭错误
            </button>
          </div>
          <details>
            <summary className="cursor-pointer text-[11px] font-medium">Technical details</summary>
            <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded bg-red-100/60 p-2 text-[11px] text-red-800">
              {this.state.error.stack ?? this.state.error.message}
            </pre>
          </details>
          {this.state.info?.componentStack && (
            <details>
              <summary className="cursor-pointer text-[11px] font-medium">Component stack</summary>
              <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded bg-red-100/60 p-2 text-[11px] text-red-800">
                {this.state.info.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

function isChunkLoadError(error: Error): boolean {
  return /dynamically imported module|importing a module script failed|failed to fetch dynamically imported module|chunkloaderror/i.test(error.message);
}

function shouldAutoReloadChunkError(): boolean {
  try {
    const href = window.location.href;
    const rawAttempt = window.sessionStorage.getItem(CHUNK_RELOAD_ATTEMPT_KEY);
    const previousAttempt = rawAttempt ? JSON.parse(rawAttempt) as { href?: string; at?: number } : null;
    const now = Date.now();
    const alreadyTriedThisPage =
      previousAttempt?.href === href && typeof previousAttempt.at === 'number' && now - previousAttempt.at < 60_000;
    if (alreadyTriedThisPage) {
      return false;
    }
    window.sessionStorage.setItem(CHUNK_RELOAD_ATTEMPT_KEY, JSON.stringify({ href, at: now }));
    return true;
  } catch {
    return false;
  }
}
