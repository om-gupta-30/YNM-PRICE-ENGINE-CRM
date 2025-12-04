'use client';

import { useState, useEffect } from 'react';

interface PdfPreviewModalProps {
  pdfBlob: Blob | null;
  isOpen: boolean;
  onClose: () => void;
  fileName?: string;
}

export default function PdfPreviewModal({
  pdfBlob,
  isOpen,
  onClose,
  fileName = 'preview.pdf',
}: PdfPreviewModalProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (pdfBlob && isOpen) {
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);

      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setPdfUrl(null);
    }
  }, [pdfBlob, isOpen]);

  // Auto-scroll window to top when modal opens
  useEffect(() => {
    if (isOpen) {
      // Immediately scroll window to top so modal is visible
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.body.classList.add('modal-open');
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.body.classList.remove('modal-open');
    };
  }, [isOpen]);

  if (!isOpen || !pdfUrl) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full h-full max-w-6xl max-h-[90vh] bg-white rounded-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-slate-800 text-white">
          <h2 className="text-lg font-semibold">PDF Preview - {fileName}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            aria-label="Close"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* PDF Viewer */}
        <div className="h-[calc(90vh-64px)] overflow-auto bg-slate-100">
          <iframe
            src={pdfUrl}
            className="w-full h-full border-0"
            title="PDF Preview"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-4 p-4 bg-slate-800 text-white">
          <a
            href={pdfUrl}
            download={fileName}
            className="px-4 py-2 bg-brand-gold hover:bg-brand-dark-gold text-white rounded-lg transition-colors font-medium"
          >
            Download PDF
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

