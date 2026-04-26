// =============================================================================
// Toast Component
// =============================================================================

import { useApp } from '../../context/AppContext';
import { CheckCircleIcon, XCircleIcon, InfoIcon, AlertTriangleIcon } from '../common/Icons';

const ICONS = {
  success: CheckCircleIcon,
  error: XCircleIcon,
  info: InfoIcon,
  warning: AlertTriangleIcon,
};

const ICON_COLORS = {
  success: 'var(--accent-secondary)',
  error: 'var(--accent-danger)',
  info: 'var(--accent-info)',
  warning: 'var(--accent-warning)',
};

export default function ToastContainer() {
  const { state, removeToast } = useApp();
  const { toasts } = state;

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" id="toast-container">
      {toasts.map((toast) => {
        const IconComponent = ICONS[toast.variant] || InfoIcon;
        const iconColor = ICON_COLORS[toast.variant] || 'var(--accent-info)';
        return (
          <div
            key={toast.id}
            className={`toast toast--${toast.variant}`}
            onClick={() => removeToast(toast.id)}
            role="alert"
          >
            <span className="toast__icon">
              <IconComponent size={18} stroke={iconColor} />
            </span>
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
        );
      })}
    </div>
  );
}
