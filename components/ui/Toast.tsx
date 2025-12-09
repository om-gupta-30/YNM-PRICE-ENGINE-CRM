'use client';

import { useEffect, useState, memo } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error';
  onClose: () => void;
  duration?: number;
}

function Toast({ message, type = 'success', onClose, duration = 3000 }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for fade out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed top-20 right-4 z-[10001] glassmorphic-premium rounded-xl p-4 shadow-2xl border-2 ${
        type === 'success' ? 'border-green-400/50' : 'border-red-400/50'
      } animate-fade-up`}
      style={{ animation: 'fade-up 0.3s ease-out' }}
    >
      <div className="flex items-center space-x-3">
        <div className={`text-2xl ${type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
          {type === 'success' ? '✓' : '✕'}
        </div>
        <p className={`font-semibold ${type === 'success' ? 'text-green-200' : 'text-red-200'}`}>
          {message}
        </p>
      </div>
    </div>
  );
}

export default memo(Toast);

