'use client';

import { useRouter, usePathname } from 'next/navigation';
import { memo } from 'react';

interface BackButtonProps {
  href?: string;
  label?: string;
}

const BackButton = memo(function BackButton({ href, label }: BackButtonProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleBack = () => {
    // Don't show on homepage or login
    if (pathname === '/' || pathname === '/login') {
      return null;
    }

    // If href is provided, use it
    if (href) {
      router.push(href);
      return;
    }

    // Special handling for section pages
    if (pathname === '/mbcb') {
      router.push('/');
      return;
    }

    // Try router.back(), but with a fallback
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      // Fallback: go to parent route or home
      const current = pathname ?? "/";
      const parentPath = current.split("/").slice(0, -1).join("/") || "/";
      router.push(parentPath);
    }
  };

  // Don't render on homepage or login
  if (pathname === '/' || pathname === '/login') {
    return null;
  }

  // Determine label based on pathname if not provided
  const getLabel = () => {
    if (label) return label;
    if (pathname === '/mbcb') return '← Back to Home';
    if (pathname?.startsWith('/mbcb/')) return '← Back';
    if (pathname === '/paint' || pathname === '/signages') return '← Back to Home';
    return '← Back';
  };

  return (
    <button
      onClick={handleBack}
      className="fixed top-4 left-4 z-[10000] inline-flex items-center glassmorphic-premium rounded-xl px-6 py-3 text-sm font-semibold text-white hover:text-premium-gold transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-premium-gold/30 group relative overflow-hidden"
      style={{
        backdropFilter: 'blur(20px)',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        position: 'fixed',
        top: '1rem',
        left: '1rem',
        zIndex: 10000,
      }}
    >
      {/* Background glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-premium-gold/0 via-premium-gold/10 to-premium-gold/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      
      <span className="mr-2 text-lg group-hover:-translate-x-1 relative z-10" style={{ transition: 'transform 0.3s ease', willChange: 'transform' }}>←</span> 
      <span className="relative z-10">{getLabel()}</span>
      
      {/* Shimmer effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 animate-shimmer" />
      </div>
    </button>
  );
});

export default BackButton;
