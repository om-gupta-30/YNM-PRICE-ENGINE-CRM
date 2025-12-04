'use client';

import { useEffect } from 'react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  onClose?: () => void;
  quotationId?: number;
  customerName?: string;
  title?: string;
  message?: string;
  isDeleting?: boolean;
}

export default function DeleteConfirmationModal({
  isOpen,
  onConfirm,
  onCancel,
  onClose,
  quotationId,
  customerName,
  title,
  message,
  isDeleting = false,
}: DeleteConfirmationModalProps) {
  // Prevent body scroll when modal opens - keep user at current position
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.classList.add('modal-open');
    }
    return () => {
      const scrollY = document.body.style.top;
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.classList.remove('modal-open');
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCancel = onCancel || onClose || (() => {});
  const displayTitle = title || 'Delete Quotation?';
  const displayMessage = message || (
    <>
      Are you sure you want to delete this quotation?
      {quotationId && (
        <p className="text-slate-300 text-sm text-center mb-6 mt-2">
          <span className="font-semibold">ID: {quotationId}</span>
          {customerName && (
            <>
              <span className="mx-2">•</span>
              <span className="font-semibold">{customerName}</span>
            </>
          )}
        </p>
      )}
    </>
  );

  return (
    <div 
      className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-up"
      onClick={handleCancel}
    >
      <div 
        className="glassmorphic-premium rounded-3xl p-8 max-w-md w-full border-2 border-red-500/30 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Warning Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center border-2 border-red-500/50">
            <span className="text-4xl">🗑️</span>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-extrabold text-white mb-4 text-center drop-shadow-lg">
          {displayTitle}
        </h2>

        {/* Message */}
        <div className="text-slate-200 text-center mb-2">
          {typeof displayMessage === 'string' ? (
            <p>{displayMessage}</p>
          ) : (
            displayMessage
          )}
        </div>
        <p className="text-red-300 text-center font-semibold mb-8">
          This action cannot be undone.
        </p>

        {/* Buttons */}
        <div className="flex gap-4">
          <button
            onClick={handleCancel}
            disabled={isDeleting}
            className="flex-1 px-6 py-3 text-base font-semibold text-white bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-200 border border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 px-6 py-3 text-base font-semibold text-white bg-red-500/80 hover:bg-red-500 rounded-xl transition-all duration-200 shadow-lg hover:shadow-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

