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

/**
 * Catches render-time exceptions in a subtree and surfaces them in-place
 * instead of unmounting the whole React tree (which is what causes the
 * "blank page" symptom). Use this around any optional feature surface
 * — the Copilot drawer is the canonical example — so a bug in the
 * subtree doesn't blank out the entire app.
 */
export class CopilotErrorBoundary extends Component<Props, State> {
  override state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    this.setState({ error, info });
    // eslint-disable-next-line no-console
    console.error('CopilotErrorBoundary caught:', error, info);
  }

  override render() {
    if (this.state.error) {
      return (
        <div
          role="alert"
          className="m-4 flex flex-col gap-2 rounded-lg border border-red-300 bg-red-50 p-4 text-[12px] text-red-900 shadow-lg"
        >
          <h2 className="text-sm font-semibold">{this.props.label ?? 'Copilot crashed'}</h2>
          <p className="font-medium">{this.state.error.message}</p>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded bg-red-100/60 p-2 text-[11px] text-red-800">
            {this.state.error.stack}
          </pre>
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
