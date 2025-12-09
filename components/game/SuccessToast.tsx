'use client';

/**
 * SuccessToast.tsx
 * 
 * Toast notification component for displaying success messages.
 * Auto-dismisses after 2 seconds and provides visual feedback for successful actions.
 */

import React, { useEffect } from 'react';

/**
 * Props for the SuccessToast component
 */
export interface SuccessToastProps {
  /** The success message to display */
  message: string | null;
  /** Whether the toast is visible */
  visible: boolean;
  /** Callback when the toast should be dismissed */
  onDismiss: () => void;
}

/**
 * SuccessToast component - displays success messages as a fixed position toast
 */
export function SuccessToast({ message, visible, onDismiss }: SuccessToastProps) {
  // Auto-dismiss after 2 seconds
  useEffect(() => {
    if (visible && message) {
      const timer = setTimeout(() => {
        onDismiss();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [visible, message, onDismiss]);

  if (!visible || !message) {
    return null;
  }

  return (
    <div 
      className="fixed top-20 left-1/2 transform -translate-x-1/2 pointer-events-auto z-50 animate-in fade-in slide-in-from-top-2 duration-300"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="bg-green-600 text-white px-6 py-3 rounded-lg shadow-xl max-w-md">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="flex-1">
            <div className="font-semibold text-sm">{message}</div>
          </div>
          <button
            onClick={onDismiss}
            className="flex-shrink-0 text-white hover:text-gray-200 transition-colors"
            aria-label="Dismiss success message"
          >
            <svg
              className="w-4 h-4"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
