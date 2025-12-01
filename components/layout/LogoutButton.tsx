'use client';

import { useRouter, usePathname } from 'next/navigation';
import { memo, useMemo, useState, useEffect } from 'react';
import { useUser } from '@/contexts/UserContext';

const LogoutButton = memo(function LogoutButton() {
  const router = useRouter();
  const pathname = usePathname();
  const { username, setUsername } = useUser();
  const [showModal, setShowModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState('End of Day');
  const [otherReason, setOtherReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user is admin on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const adminStatus = localStorage.getItem('isAdmin');
      setIsAdmin(adminStatus === 'true');
    }
  }, []);

  const options = useMemo(
    () => ['Lunch Break', 'Meeting / Field Visit', 'End of Day', 'Other'],
    []
  );

  const beginLogout = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    // If admin, logout directly without showing modal
    if (isAdmin) {
      handleDirectLogout();
    } else {
      // If employee, show modal to ask for reason
      setShowModal(true);
    }
  };

  const handleDirectLogout = async () => {
    setSubmitting(true);
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
    } finally {
      setSubmitting(false);
    }
  };

  const finalizeLogout = async () => {
    setSubmitting(true);
    try {
      const activeUser = username || (typeof window !== 'undefined' ? localStorage.getItem('username') : '');
      if (activeUser) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: activeUser,
            reason: selectedReason === 'Meeting / Field Visit' ? 'Meeting' : selectedReason,
            otherNote: selectedReason === 'Other' ? otherReason : undefined,
            isAdmin: false, // This is for employees only
          }),
        });
      }
    } catch (error) {
      console.error('Logout tracking error:', error);
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth');
        localStorage.removeItem('username');
        localStorage.removeItem('userId');
        localStorage.removeItem('department');
        localStorage.removeItem('isAdmin');
      }
      setUsername(null);
      setSubmitting(false);
      setShowModal(false);
      router.replace('/login');
    }
  };

  const handleChangePassword = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    router.push('/change-password');
  };

  // Don't show on login or change-password page
  if (pathname === '/login' || pathname === '/change-password') {
    return null;
  }

  return (
    <div
      className="relative"
      style={{
        zIndex: 9999,
        margin: 0,
        padding: 0,
        pointerEvents: 'auto',
      }}
    >
      <button
        type="button"
        onClick={beginLogout}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        disabled={submitting}
        className="glassmorphic-premium rounded-xl text-sm font-semibold text-white hover:text-premium-gold transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-premium-gold/30 cursor-pointer btn-ripple btn-press btn-3d disabled:opacity-60 disabled:cursor-not-allowed"
        style={{
          backdropFilter: 'blur(20px)',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          cursor: 'pointer',
          pointerEvents: 'auto',
          padding: '8px 14px',
          margin: 0,
        }}
      >
        {submitting ? 'Logging out…' : 'Log Out'}
      </button>
      {showModal && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center"
          style={{ zIndex: 99999 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowModal(false);
              setOtherReason('');
            }
          }}
        >
          <div 
            className="glassmorphic-premium p-6 rounded-3xl w-full max-w-md space-y-5 border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-white">Why are you logging out?</h3>
            <div className="space-y-3">
              {options.map((option) => (
                <button
                  key={option}
                  onClick={() => setSelectedReason(option)}
                  className={`w-full text-left px-4 py-3 rounded-2xl border ${
                    selectedReason === option
                      ? 'border-premium-gold text-white bg-premium-gold/20'
                      : 'border-white/10 text-slate-300 hover:border-white/30'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            {selectedReason === 'Other' && (
              <textarea
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
                placeholder="Add a quick note"
                className="w-full rounded-2xl bg-white/5 border border-white/10 text-white p-3 text-sm"
              />
            )}
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setOtherReason('');
                  setSubmitting(false);
                }}
                className="text-slate-300 hover:text-white text-sm"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={finalizeLogout}
                disabled={submitting}
                className="px-4 py-2 rounded-2xl bg-premium-gold text-slate-900 font-semibold hover:bg-yellow-400 transition disabled:opacity-60"
              >
                {submitting ? 'Logging out…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default LogoutButton;

