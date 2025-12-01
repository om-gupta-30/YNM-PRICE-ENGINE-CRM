'use client';

import { useRouter, usePathname } from 'next/navigation';
import { memo } from 'react';
import { useUser } from '@/contexts/UserContext';

const LogoutButton = memo(function LogoutButton() {
  const router = useRouter();
  const pathname = usePathname();
  const { setUsername } = useUser();

  const handleLogout = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      // Clear all localStorage items
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth');
        localStorage.removeItem('username');
        localStorage.removeItem('userId');
        localStorage.removeItem('department');
        localStorage.removeItem('isAdmin');
      }
      
      // Clear user context
      setUsername(null);
      
      // Navigate to login page
      router.replace('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Still try to navigate even if localStorage fails
      router.replace('/login');
    }
  };

  // Don't show on login page
  if (pathname === '/login') {
    return null;
  }

  return (
    <button
      onClick={handleLogout}
      className="fixed top-4 right-4 z-[10000] glassmorphic-premium rounded-xl px-6 py-3 text-sm font-semibold text-white hover:text-premium-gold transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-premium-gold/30"
      style={{
        backdropFilter: 'blur(20px)',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        zIndex: 10000,
      }}
    >
      Log Out
    </button>
  );
});

export default LogoutButton;

