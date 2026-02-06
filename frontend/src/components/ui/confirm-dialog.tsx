import { AlertTriangle, X } from 'lucide-react';
import { Button } from './button';

interface ConfirmDialogProps {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

export function ConfirmDialog({ 
  title = "Confirm Action", 
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  variant = 'danger'
}: ConfirmDialogProps) {
  const variantStyles = {
    danger: {
      iconBg: 'bg-red-500',
      confirmButton: 'bg-red-600 hover:bg-red-700',
    },
    warning: {
      iconBg: 'bg-orange-500',
      confirmButton: 'bg-orange-600 hover:bg-orange-700',
    },
    info: {
      iconBg: 'bg-blue-500',
      confirmButton: 'bg-blue-600 hover:bg-blue-700',
    },
  };

  const styles = variantStyles[variant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full border-2 border-slate-200 dark:border-slate-700">
        {/* Icon - Centered at top, overlapping border */}
        <div className="flex justify-center -mt-10 mb-0">
          <div className="relative z-20">
            <div className={`w-16 h-16 ${styles.iconBg} rounded-full flex items-center justify-center shadow-lg border-4 border-white dark:border-slate-900`}>
              <AlertTriangle className="h-8 w-8 text-white" strokeWidth={3} />
            </div>
          </div>
        </div>

        {/* Close button - top right */}
        <button
          onClick={onCancel}
          className="absolute top-3 right-3 z-10 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        {/* Content - with top padding to accommodate icon */}
        <div className="px-8 pb-8 pt-6">
          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 text-center mb-4">
            {title}
          </h2>

          {/* Message */}
          <p className="text-gray-600 dark:text-slate-300 text-center mb-8 leading-relaxed">
            {message}
          </p>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-center">
            <Button
              onClick={onCancel}
              variant="outline"
              className="px-8 py-3 rounded-lg font-medium transition-colors border-2 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {cancelText}
            </Button>
            <Button
              onClick={onConfirm}
              className={`${styles.confirmButton} text-white px-8 py-3 rounded-lg font-medium transition-colors shadow-md`}
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
