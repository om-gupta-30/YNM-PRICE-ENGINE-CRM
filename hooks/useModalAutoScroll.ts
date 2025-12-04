/**
 * @deprecated This hook is no longer used. Modals now use portals and bringElementIntoView
 * instead of locking body scroll. This hook is kept for backwards compatibility but does nothing.
 * 
 * Use bringElementIntoView utility and React portals instead.
 */

import { useRef, RefObject } from 'react';

/**
 * @deprecated - Returns a ref but does not lock scroll. Kept for backwards compatibility.
 * Use bringElementIntoView utility and React portals instead.
 */
export function useModalAutoScroll(isOpen: boolean): RefObject<HTMLDivElement> {
  const modalRef = useRef<HTMLDivElement>(null);
  // No scroll locking - modals use portals and bringElementIntoView instead
  return modalRef;
}

export default useModalAutoScroll;
