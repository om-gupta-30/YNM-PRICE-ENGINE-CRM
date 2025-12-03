'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Root page - AuthGuard will handle redirects
// This component just renders nothing while redirect happens
export default function Home() {
  const router = useRouter();
  
  useEffect(() => {
    // Small delay to ensure AuthGuard has processed
    const timer = setTimeout(() => {
      // AuthGuard in layout will handle the redirect
      // This is just a fallback
    }, 100);
    
    return () => clearTimeout(timer);
  }, [router]);

  // Return a minimal loading state instead of null to avoid chunk issues
  return (
    <div style={{ display: 'none' }} aria-hidden="true">
      Loading...
    </div>
  );
}
