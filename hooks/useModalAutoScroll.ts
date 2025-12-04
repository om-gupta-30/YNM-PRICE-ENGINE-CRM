'use client';

import { useEffect, useRef, RefObject } from 'react';

/**
 * Custom hook for modal behavior
 * - Simply prevents body scroll while modal is open
 * - Scrolls modal content to top
 */
export function useModalAutoScroll(isOpen: boolean): RefObject<HTMLDivElement> {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Just hide overflow on body
      document.body.style.overflow = 'hidden';
      
      // Scroll modal content to top
      setTimeout(() => {
        if (modalRef.current) {
          modalRef.current.scrollTop = 0;
        }
      }, 10);
    }
    
    return () => {
      // Restore body scroll
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return modalRef;
}

export default useModalAutoScroll;
