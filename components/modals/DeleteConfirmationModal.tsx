'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { bringElementIntoView } from '@/lib/utils/bringElementIntoView';

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
  const [mounted, setMounted] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Bring modal into view when it opens
  useEffect(() => {
    if (isOpen && modalRef.current) {
      bringElementIntoView(modalRef.current);
    }
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

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

  const modalContent = (
    <div 
      className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-up"
      onClick={handleCancel}
    >
      <div 
        ref={modalRef}
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

  return createPortal(modalContent, document.body);
}

