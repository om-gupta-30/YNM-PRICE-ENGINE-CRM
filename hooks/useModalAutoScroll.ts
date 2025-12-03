'use client';

import { useEffect, useRef, RefObject } from 'react';

/**
 * Custom hook to auto-scroll when a modal opens
 * - Scrolls window to top for visibility
 * - Optionally scrolls modal content to top
 * - Prevents body scroll while modal is open
 */
export function useModalAutoScroll(isOpen: boolean): RefObject<HTMLDivElement> {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Scroll window to top so modal is visible
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
      
      // Scroll modal content to top after a brief delay
      setTimeout(() => {
        if (modalRef.current) {
          modalRef.current.scrollTop = 0;
        }
      }, 50);
    }
    
    return () => {
      // Restore body scroll when modal closes
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return modalRef;
}

export default useModalAutoScroll;
