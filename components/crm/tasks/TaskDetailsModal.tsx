'use client';

import { useEffect } from 'react';
import { Task } from '@/lib/constants/types';

interface TaskDetailsModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function TaskDetailsModal({ task, isOpen, onClose }: TaskDetailsModalProps) {
  // Auto-scroll window to top when modal opens
  useEffect(() => {
    if (isOpen) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !task) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="glassmorphic-premium rounded-3xl border border-white/10 p-6 w-full max-w-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-bold text-white">Task Details</h3>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white text-3xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="space-y-3 text-sm text-slate-200">
          <div>
            <p className="text-white/60 text-xs uppercase tracking-[0.4em]">Title</p>
            <p className="text-white text-lg font-semibold">{task.title}</p>
          </div>
          <div>
            <p className="text-white/60 text-xs uppercase tracking-[0.4em]">Description</p>
            <p>{task.description || 'No description yet.'}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-white/60 text-xs uppercase tracking-[0.4em]">Status</p>
              <p>{task.status}</p>
            </div>
            <div>
              <p className="text-white/60 text-xs uppercase tracking-[0.4em]">Assigned To</p>
              <p>{task.assigned_to}</p>
            </div>
          </div>
          <div>
            <p className="text-white/60 text-xs uppercase tracking-[0.4em]">Due Date</p>
            <p>{new Date(task.due_date).toLocaleString('en-IN')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
