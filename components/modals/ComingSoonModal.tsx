'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { bringElementIntoView } from '@/lib/utils/bringElementIntoView';

interface ComingSoonModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature: string;
}

export default function ComingSoonModal({ isOpen, onClose, feature }: ComingSoonModalProps) {
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
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-up"
      onClick={onClose}
    >
      <div 
        ref={modalRef}
        className="glassmorphic-premium rounded-3xl p-8 max-w-md w-full border-2 border-premium-gold/30 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <div className="text-6xl mb-4">🚧</div>
          <h2 className="text-2xl font-extrabold text-white mb-2">Coming Soon!</h2>
          <p className="text-slate-300 mb-6">
            {feature} feature is under development and will be available soon.
          </p>
          <button
            onClick={onClose}
            className="px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-premium-gold to-dark-gold hover:from-dark-gold hover:to-premium-gold rounded-lg transition-all duration-200"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

