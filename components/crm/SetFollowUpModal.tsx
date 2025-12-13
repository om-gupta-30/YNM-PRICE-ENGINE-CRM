'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import DatePicker from 'react-datepicker';
import { PortalPopperContainer } from '@/components/ui/PortalPopperContainer';
import { bringElementIntoView } from '@/lib/utils/bringElementIntoView';
import 'react-datepicker/dist/react-datepicker.css';

interface SetFollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: number;
  leadName: string;
  currentFollowUpDate: string | null;
  onFollowUpSet: () => void;
}

export default function SetFollowUpModal({ isOpen, onClose, leadId, leadName, currentFollowUpDate, onFollowUpSet }: SetFollowUpModalProps) {
  const [followUpDate, setFollowUpDate] = useState<Date | null>(
    currentFollowUpDate ? new Date(currentFollowUpDate) : null
  );
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Update date when currentFollowUpDate changes
  useEffect(() => {
    if (currentFollowUpDate) {
      setFollowUpDate(new Date(currentFollowUpDate));
    } else {
      setFollowUpDate(null);
    }
  }, [currentFollowUpDate]);

  // Bring modal into view when it opens
  useEffect(() => {
    if (isOpen && modalRef.current) {
      bringElementIntoView(modalRef.current);
    }
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!followUpDate) {
      alert('Please select a follow-up date');
      return;
    }

    try {
      setSubmitting(true);
      const username = typeof window !== 'undefined' ? localStorage.getItem('username') || 'Admin' : 'Admin';

      // Format date as YYYY-MM-DD for API
      const dateString = followUpDate.toISOString().split('T')[0];

      const response = await fetch(`/api/crm/leads/${leadId}/follow-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          follow_up_date: dateString,
          created_by: username,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to set follow-up');
      }

      // Trigger notification refresh immediately
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('refreshNotifications'));
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

      // Trigger notification refresh immediately
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('refreshNotifications'));
      }

      setFollowUpDate(null);
      onFollowUpSet();
      onClose();
    } catch (error: any) {
      console.error('Error removing follow-up:', error);
      alert(error.message || 'Failed to remove follow-up');
    } finally {
      setSubmitting(false);
    }
  };

  // Get today's date
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const modalContent = (
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
            <DatePicker
              selected={followUpDate}
              onChange={(date: Date | null) => setFollowUpDate(date)}
              minDate={today}
              dateFormat="dd/MM/yyyy"
              className="w-full px-4 py-3 text-white bg-slate-700/50 hover:bg-slate-600/50 border border-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold"
              wrapperClassName="w-full"
              placeholderText="Select follow-up date"
              required
              popperPlacement="bottom-start"
              popperContainer={PortalPopperContainer}
            />
            {currentFollowUpDate && (
              <p className="text-xs text-slate-400 mt-2">
                Current follow-up: {new Date(currentFollowUpDate).toLocaleDateString('en-IN')}
              </p>
            )}
          </div>

          <div className="flex gap-4 pt-4">
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
              {submitting ? 'Saving...' : currentFollowUpDate ? 'Update Follow-Up' : 'Set Follow-Up'}
            </button>
          </div>
          {currentFollowUpDate && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={submitting}
              className="w-full px-6 py-3 text-sm font-semibold text-white bg-red-500/80 hover:bg-red-500 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Remove Follow-Up Date
            </button>
          )}
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

