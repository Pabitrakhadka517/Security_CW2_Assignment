import { EmptyState, ErrorState } from './States';

/**
 * Thin composition over the existing EmptyState/ErrorState components that
 * gives every list/detail fetch the same three-way branching: a genuine
 * error (with retry) is no longer indistinguishable from "nothing here yet".
 * Pass a `loading` node (usually one of the Skeleton.jsx variants, since the
 * right skeleton shape differs per page) — FetchState only owns the
 * error/empty/success branching, not the loading visual.
 */
export default function FetchState({
  isLoading,
  isError,
  isEmpty,
  loading = null,
  errorTitle,
  errorDescription,
  onRetry,
  emptyTitle,
  emptyDescription,
  emptyIcon,
  emptyAction,
  children,
}) {
  if (isLoading) return loading;

  if (isError) {
    return (
      <ErrorState
        title={errorTitle}
        description={errorDescription}
        onRetry={onRetry}
      />
    );
  }

  if (isEmpty) {
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }

  return children;
}
