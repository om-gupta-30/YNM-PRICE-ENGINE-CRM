'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { bringElementIntoView } from '@/lib/utils/bringElementIntoView';

interface AddNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: number;
  leadName: string;
  onNoteAdded: () => void;
}

export default function AddNoteModal({ isOpen, onClose, leadId, leadName, onNoteAdded }: AddNoteModalProps) {
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
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
    
    if (!note.trim()) {
      alert('Please enter a note');
      return;
    }

    try {
      setSubmitting(true);
      const username = typeof window !== 'undefined' ? localStorage.getItem('username') || 'Admin' : 'Admin';

      const response = await fetch('/api/crm/leads/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: leadId,
          activity_type: 'note',
          description: note.trim(),
          created_by: username,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to add note');
      }

      setNote('');
      onNoteAdded();
      onClose();
    } catch (error: any) {
      console.error('Error adding note:', error);
      alert(error.message || 'Failed to add note');
    } finally {
      setSubmitting(false);
    }
  };

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
          <h2 className="text-2xl font-extrabold text-white">Add Note</h2>
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
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Enter your note here..."
              rows={6}
              className="w-full px-4 py-3 text-white bg-slate-700/50 hover:bg-slate-600/50 border border-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold resize-none"
              required
            />
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
              {submitting ? 'Adding...' : 'Add Note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

