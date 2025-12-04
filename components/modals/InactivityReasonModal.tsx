'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { bringElementIntoView } from '@/lib/utils/bringElementIntoView';

interface InactivityReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  username: string;
}

export default function InactivityReasonModal({ isOpen, onClose, onSubmit, username }: InactivityReasonModalProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(reason.trim());
      setReason('');
    } catch (error) {
      console.error('Error submitting inactivity reason:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div 
      className="fixed inset-0 z-[10002] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-up"
    >
      <div 
        ref={modalRef}
        className="glassmorphic-premium rounded-3xl max-w-2xl w-full border-2 border-premium-gold/30 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-white/10">
          <div>
            <h2 className="text-2xl font-extrabold text-white drop-shadow-lg">
              Inactivity Reason Required
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              You were automatically logged out due to inactivity. Please provide a reason.
            </p>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Reason for Inactivity <span className="text-red-400">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="input-premium w-full px-4 py-3 text-white bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold focus:border-transparent min-h-[120px] resize-y"
                placeholder="Please explain why you were inactive (e.g., 'In a meeting', 'On a break', 'Technical issue', etc.)"
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={isSubmitting || !reason.trim()}
                className="w-full px-6 py-3 text-lg font-bold text-white bg-gradient-to-r from-premium-gold to-dark-gold hover:from-dark-gold hover:to-premium-gold rounded-xl transition-all duration-300 shadow-lg shadow-premium-gold/50 hover:shadow-xl hover:shadow-premium-gold/70 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Submit & Continue'}
              </button>
            </div>
            <p className="text-xs text-slate-400 text-center mt-2">
              This information helps track employee activity and is required to continue.
            </p>
          </form>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
