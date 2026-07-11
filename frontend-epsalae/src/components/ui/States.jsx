import { Component } from 'react';
import { PackageOpen, AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Reusable UX-state components: consistent empty, error and fallback UIs so every
 * screen handles "no data" and "something broke" the same polished way.
 */

/** Shown when a query/list returns no items. */
export function EmptyState({
  icon: Icon = PackageOpen,
  title = 'Nothing here yet',
  description = '',
  action = null,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-16 px-4 ${className}`}>
      <div className="flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-slate-100">
        <Icon className="w-8 h-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Shown when a fetch/action fails — offers a retry. */
export function ErrorState({
  title = 'Could not load this',
  description = 'Something went wrong while loading. Please try again.',
  onRetry = null,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-16 px-4 ${className}`}>
      <div className="flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-red-50">
        <AlertTriangle className="w-8 h-8 text-red-500" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-slate-500">{description}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-xl bg-[#1A3C8A] hover:bg-[#112960] transition"
        >
          <RefreshCw className="w-4 h-4" /> Try again
        </button>
      )}
    </div>
  );
}

/**
 * Section-level error boundary. Wrap an individual section (e.g. a homepage
 * carousel) so that if it throws, only that section shows a fallback instead of
 * crashing the whole page. Complements the app-level ErrorBoundary.
 */
export class SectionErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    if (import.meta.env.DEV) console.error('[SectionErrorBoundary]', this.props.name, error, info?.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <ErrorState
          title="This section couldn't load"
          description="The rest of the page is fine — you can keep browsing."
          onRetry={() => this.setState({ hasError: false })}
        />
      );
    }
    return this.props.children;
  }
}

export default EmptyState;
