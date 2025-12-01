'use client';

import { useState, useEffect, useRef } from 'react';

interface SetFollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: number;
  leadName: string;
  currentFollowUpDate: string | null;
  onFollowUpSet: () => void;
}

export default function SetFollowUpModal({ isOpen, onClose, leadId, leadName, currentFollowUpDate, onFollowUpSet }: SetFollowUpModalProps) {
  const [followUpDate, setFollowUpDate] = useState(currentFollowUpDate || '');
  const [submitting, setSubmitting] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to top when modal opens
  useEffect(() => {
    if (isOpen && modalRef.current) {
      setTimeout(() => {
        if (modalRef.current) {
          modalRef.current.scrollTop = 0;
        }
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!followUpDate) {
      alert('Please select a follow-up date');
      return;
    }

    try {
      setSubmitting(true);
      const username = typeof window !== 'undefined' ? localStorage.getItem('username') || 'Admin' : 'Admin';

      const response = await fetch(`/api/crm/leads/${leadId}/follow-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          follow_up_date: followUpDate,
          created_by: username,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to set follow-up');
      }

      onFollowUpSet();
      onClose();
    } catch (error: any) {
      console.error('Error setting follow-up:', error);
      alert(error.message || 'Failed to set follow-up');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm('Are you sure you want to remove the follow-up date?')) {
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`/api/crm/leads/${leadId}/follow-up`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to remove follow-up');
      }

      setFollowUpDate('');
      onFollowUpSet();
      onClose();
    } catch (error: any) {
      console.error('Error removing follow-up:', error);
      alert(error.message || 'Failed to remove follow-up');
    } finally {
      setSubmitting(false);
    }
  };

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  return (
    <div 
      className="fixed inset-0 z-[10002] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-up"
      onClick={onClose}
    >
      <div 
        ref={modalRef}
        className="glassmorphic-premium rounded-3xl p-6 max-w-md w-full border-2 border-premium-gold/30 shadow-2xl"
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-extrabold text-white">Set Follow-Up</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl font-bold transition-colors"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Lead: <span className="text-premium-gold">{leadName}</span>
            </label>
            <input
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              min={today}
              className="w-full px-4 py-3 text-white bg-slate-700/50 hover:bg-slate-600/50 border border-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold"
              required
            />
            {currentFollowUpDate && (
              <p className="text-xs text-slate-400 mt-2">
                Current follow-up: {new Date(currentFollowUpDate).toLocaleDateString('en-IN')}
              </p>
            )}
          </div>

          <div className="flex gap-4 pt-4">
            {currentFollowUpDate && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={submitting}
                className="px-4 py-3 text-sm font-semibold text-white bg-red-500/80 hover:bg-red-500 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Remove
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 text-sm font-semibold text-white bg-slate-600/80 hover:bg-slate-700 rounded-lg transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-premium-gold to-dark-gold hover:from-dark-gold hover:to-premium-gold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Saving...' : 'Set Follow-Up'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

