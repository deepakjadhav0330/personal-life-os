import { useToastStore } from '../../stores/useToastStore';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '../../utils/cn';

const icons = {
  success: <CheckCircle size={16} className="text-success" />,
  error: <AlertCircle size={16} className="text-danger" />,
  warning: <AlertTriangle size={16} className="text-warning" />,
  info: <Info size={16} className="text-info" />,
};

const borderColors = {
  success: 'border-l-success',
  error: 'border-l-danger',
  warning: 'border-l-warning',
  info: 'border-l-info',
};

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (!toasts.length) return null;

  return (
    <div className="fixed top-safe right-0 left-0 z-toast flex flex-col items-center gap-2 pt-4 px-4 pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-card glass-elevated shadow-glass',
            'w-full max-w-sm border-l-4 pointer-events-auto animate-slide-down',
            borderColors[toast.type],
          )}
        >
          {icons[toast.type]}
          <p className="flex-1 text-sm text-content-primary">{toast.message}</p>
          <button onClick={() => removeToast(toast.id)} className="text-content-muted hover:text-content-secondary">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
