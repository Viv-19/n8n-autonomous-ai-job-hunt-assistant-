// =============================================================================
// Toast Component
// =============================================================================

import { useApp } from '../../context/AppContext';

const ICONS = {
  success: '✅',
  error: '❌',
  info: 'ℹ️',
  warning: '⚠️',
};

export default function ToastContainer() {
  const { state, removeToast } = useApp();
  const { toasts } = state;

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" id="toast-container">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast--${toast.variant}`}
          onClick={() => removeToast(toast.id)}
          role="alert"
        >
          <span className="toast__icon">{ICONS[toast.variant] || 'ℹ️'}</span>
          <div className="toast__content">
            <div className="toast__title">{toast.title}</div>
            {toast.message && (
              <div className="toast__message">{toast.message}</div>
            )}
          </div>
          <button
            className="toast__close"
            onClick={(e) => { e.stopPropagation(); removeToast(toast.id); }}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
