'use client';

import { useEffect, useRef, RefObject } from 'react';

/**
 * Custom hook to auto-scroll when a modal opens
 * - Immediately scrolls window to top for visibility
 * - Prevents body scroll while modal is open
 * - Optionally scrolls modal content to top
 * - Uses instant scroll for immediate visibility
 */
export function useModalAutoScroll(isOpen: boolean): RefObject<HTMLDivElement> {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Immediately scroll window to top so modal is visible (instant, not smooth)
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      
      // Also try scrolling to the very top using scrollTop for compatibility
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      
      // Add class to prevent scroll on iOS
      document.body.classList.add('modal-open');
      
      // Scroll modal content to top after a brief delay
      setTimeout(() => {
        if (modalRef.current) {
          modalRef.current.scrollTop = 0;
          // Also scroll the modal into view
          modalRef.current.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'start' });
        }
      }, 10);
    }
    
    return () => {
      // Restore body scroll when modal closes
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.body.classList.remove('modal-open');
    };
  }, [isOpen]);

  return modalRef;
}

export default useModalAutoScroll;
