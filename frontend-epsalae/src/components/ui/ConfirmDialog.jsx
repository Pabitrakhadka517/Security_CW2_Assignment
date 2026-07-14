import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';

/**
 * Shared confirmation dialog for destructive/high-stakes actions (remove
 * item, revoke session, delete record, cancel order). Replaces bare
 * window.confirm() calls and one-click destructive buttons app-wide with a
 * single accessible, consistently-worded pattern: role="dialog", focus
 * restored to the trigger on close, and Escape/backdrop-click to cancel.
 *
 * Initial focus goes to Cancel rather than Confirm — a stray Enter/Space
 * (e.g. from a fast double-click that also fires a keydown, or a user who
 * hits Enter out of habit) should never complete a destructive action.
 */
export default function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger', // 'danger' | 'warning'
  onConfirm,
  onCancel,
  isLoading = false,
}) {
  const cancelRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement;
      cancelRef.current?.focus();
    } else {
      previousFocusRef.current?.focus?.();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === 'Escape') onCancel?.();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onCancel]);

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prevOverflow; };
  }, [isOpen]);

  if (!isOpen) return null;

  const tone = variant === 'warning'
    ? { iconBg: 'bg-amber-50', iconColor: 'text-amber-500', btn: 'bg-amber-500 hover:bg-amber-600 focus-visible:ring-amber-400' }
    : { iconBg: 'bg-red-50', iconColor: 'text-red-500', btn: 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-500' };

  return createPortal(
    <div
      className="fixed inset-0 z-100 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby={description ? 'confirm-dialog-description' : undefined}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} aria-hidden="true" />

      <div className="relative w-full max-w-sm rounded-card bg-white p-6 shadow-2xl animate-fade-in">
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close dialog"
          className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>

        <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${tone.iconBg}`}>
          <AlertTriangle className={`h-6 w-6 ${tone.iconColor}`} aria-hidden="true" />
        </div>

        <h2 id="confirm-dialog-title" className="text-center text-lg font-semibold text-gray-900">
          {title}
        </h2>
        {description && (
          <p id="confirm-dialog-description" className="mt-2 text-center text-sm text-gray-500">
            {description}
          </p>
        )}

        <div className="mt-6 flex gap-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-btn border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 rounded-btn px-4 py-2.5 text-sm font-medium text-white transition focus:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${tone.btn}`}
          >
            {isLoading ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
