'use client';

import { useEffect, useRef, RefObject } from 'react';

/**
 * Custom hook for modal behavior
 * - Prevents body scroll while modal is open (modal stays where user is)
 * - Scrolls modal content to top
 * - Does NOT scroll the page - fixed modals are already visible in viewport
 */
export function useModalAutoScroll(isOpen: boolean): RefObject<HTMLDivElement> {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Save current scroll position
      const scrollY = window.scrollY;
      
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.classList.add('modal-open');
      
      // Scroll modal content to top after a brief delay
      setTimeout(() => {
        if (modalRef.current) {
          modalRef.current.scrollTop = 0;
        }
      }, 10);
    }
    
    return () => {
      // Restore body scroll when modal closes
      const scrollY = document.body.style.top;
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.classList.remove('modal-open');
      
      // Restore scroll position
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    };
  }, [isOpen]);

  return modalRef;
}

export default useModalAutoScroll;
