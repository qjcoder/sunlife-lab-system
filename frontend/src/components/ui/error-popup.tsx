import { X } from 'lucide-react';
import { Button } from './button';

interface ErrorPopupProps {
  title?: string;
  message: string;
  onClose: () => void;
  onTryAgain?: () => void;
  showTryAgain?: boolean;
}

export function ErrorPopup({ 
  title = "Error!", 
  message, 
  onClose, 
  onTryAgain,
  showTryAgain = true 
}: ErrorPopupProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full">
        {/* Error Icon - Centered at top, overlapping border - positioned with padding to prevent cropping */}
        <div className="flex justify-center -mt-10 mb-0">
          <div className="relative z-20">
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-lg border-4 border-white">
              <X className="h-8 w-8 text-white" strokeWidth={3} />
            </div>
          </div>
        </div>

        {/* Close button - top right */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        {/* Content - with top padding to accommodate icon */}
        <div className="px-8 pb-8 pt-6">
          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-4">
            {title}
          </h2>

          {/* Message */}
          <p className="text-gray-500 text-center mb-8 leading-relaxed">
            {message}
          </p>

          {/* Try Again Button */}
          {showTryAgain && onTryAgain && (
            <div className="flex justify-center">
              <Button
                onClick={onTryAgain}
                className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg font-medium transition-colors shadow-md"
              >
                Try Again
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
