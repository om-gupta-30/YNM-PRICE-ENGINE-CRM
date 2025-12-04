'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { bringElementIntoView } from '@/lib/utils/bringElementIntoView';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (activity: any) => void;
}

export default function ActivityCreationModal({ isOpen, onClose, onCreated }: Props) {
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

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="glassmorphic-premium rounded-3xl border border-white/10 p-6 w-full max-w-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/60">Add Activity</p>
            <h3 className="text-2xl font-bold text-white">Modal placeholder</h3>
            <p className="text-slate-300 text-sm">
              In Step 5 we will add all the smart baby fields.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white text-3xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <button
          onClick={() => onCreated({})}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-premium-gold to-dark-gold text-white font-semibold shadow-lg hover:shadow-premium-gold/50 transition"
        >
          Pretend to Add Activity
        </button>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
