'use client';

import { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';

interface PortalPopperContainerProps {
  children?: React.ReactNode;
}

export function PortalPopperContainer({ children }: PortalPopperContainerProps) {
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPortalRoot(document.body);
    }
  }, []);

  if (!portalRoot) {
    return <>{children}</>;
  }

  return ReactDOM.createPortal(children, portalRoot);
}

