'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useUser } from '@/contexts/UserContext';
import InactivityReasonModal from '@/components/modals/InactivityReasonModal';

export default function LoginPage() {
  const router = useRouter();
  const { setUsername } = useUser();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showInactivityModal, setShowInactivityModal] = useState(false);
  const [loggedInUsername, setLoggedInUsername] = useState('');

  // Redirect if already logged in (handled by AuthGuard, but keep for safety)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const auth = localStorage.getItem('auth');
      if (auth === 'true') {
        router.replace('/home');
      }
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Capture state values at the start to avoid closure issues
    const currentUserId = userId;
    const currentPassword = password;

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: currentUserId, password: currentPassword }),
      });

      let data;
      try {
        data = await response.json();
      } catch (jsonError: any) {
        console.error('JSON parse error:', jsonError);
        setError('Invalid response from server. Please try again.');
        setIsLoading(false);
        return;
      }

      // Check if response has success flag first
      if (!data?.success) {
        const errorMsg = data?.error || 'Invalid user ID or password';
        console.error('Login failed:', errorMsg);
        setError(errorMsg);
        setIsLoading(false);
        return;
      }

      // Check response status after checking success flag
      if (!response.ok) {
        const errorMsg = data?.error || 'Invalid user ID or password';
        console.error('Login failed:', errorMsg);
        setError(errorMsg);
        setIsLoading(false);
        return;
      }

      // Store auth flag, username, department, and admin status in localStorage
      // Handle both new format (data.user) and old format (data.userId) for compatibility
      const username = data.user?.username || data.userId || '';
      const userDbId = data.user?.id || data.id || '';
      
      if (!username) {
        console.error('No username in response:', data);
        setError('Invalid login response. Please try again.');
        setIsLoading(false);
        return;
      }

      localStorage.setItem('auth', 'true');
      localStorage.setItem('username', username);
      localStorage.setItem('userId', userDbId.toString());
      localStorage.setItem('department', data.department || 'Sales');
      localStorage.setItem('isAdmin', data.isAdmin ? 'true' : 'false');
      // Update global username context
      setUsername(username);
      
      // Check if this was an auto-logout (only for employees, not admin)
      const wasAutoLogout = localStorage.getItem('auto_logout') === 'true';
      const isEmployee = !data.isAdmin;
      
      if (wasAutoLogout && isEmployee) {
        // Show inactivity reason modal before redirecting
        setLoggedInUsername(username);
        setShowInactivityModal(true);
        // Don't redirect yet - wait for user to submit reason
      } else {
        // Clear auto-logout flag if it exists
        localStorage.removeItem('auto_logout');
        localStorage.removeItem('auto_logout_time');
        // Redirect to landing page (use replace to prevent back button issues)
        router.replace('/home');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      const errorMsg = err?.message || 'An error occurred. Please try again.';
      setError(errorMsg);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 relative">
      {/* Background glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-gold/25 rounded-full blur-[100px] opacity-70 -z-0 animate-pulse"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-brand-primary/20 rounded-full blur-[80px] opacity-60 -z-0 animate-pulse" style={{ animationDelay: '1s' }}></div>

      {/* Login Card */}
      <div className="w-full max-w-md relative z-10">
        <div className="glassmorphic-premium rounded-3xl p-12 shadow-2xl card-hover-gold">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="glassmorphic-premium rounded-2xl p-4 shadow-xl">
              <Image
                src="/LOGO.png"
                alt="YNM Safety Logo"
                width={200}
                height={90}
                className="object-contain"
                priority
              />
            </div>
          </div>

          {/* Header */}
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-300 mb-4">Login</h2>
            <div className="gold-divider mx-auto"></div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            {/* User ID Input */}
            <div>
              <label htmlFor="userId" className="block text-sm font-semibold text-slate-200 mb-3">
                User ID
              </label>
              <input
                id="userId"
                type="text"
                value={userId}
                onChange={(e) => {
                  setUserId(e.target.value);
                  setError('');
                }}
                className="input-premium w-full px-6 py-4 text-white placeholder:text-slate-400"
                placeholder="Enter your User ID"
                required
                autoComplete="username"
              />
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-200 mb-3">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  className="input-premium w-full px-6 py-4 pr-12 text-white placeholder:text-slate-400"
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/20 border border-red-400/50 rounded-xl p-4 backdrop-blur-sm animate-fade-up">
                <p className="text-red-200 text-sm font-medium text-center">{error}</p>
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-premium-gold btn-ripple btn-press btn-3d w-full px-8 py-4 text-lg shimmer relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                boxShadow: '0 0 20px rgba(209, 168, 90, 0.3)',
              }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <span className="animate-spin mr-2">⏳</span>
                  Logging in...
                </span>
              ) : (
                'LOG IN'
              )}
            </button>

            {/* Change Password Link */}
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => router.push('/change-password')}
                className="text-slate-300 hover:text-brand-gold transition-colors duration-200 text-sm font-medium underline underline-offset-2"
              >
                🔑 Change Password
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Inactivity Reason Modal */}
      <InactivityReasonModal
        isOpen={showInactivityModal}
        onClose={() => {
          // Modal should not be closable without submitting - this is just for safety
          // In practice, user must submit reason to continue
        }}
        onSubmit={async (reason: string) => {
          try {
            // Submit inactivity reason to API
            const response = await fetch('/api/auth/log-inactivity-reason', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                username: loggedInUsername,
                reason,
              }),
            });

            if (response.ok) {
              // Clear auto-logout flag
              localStorage.removeItem('auto_logout');
              localStorage.removeItem('auto_logout_time');
              setShowInactivityModal(false);
              // Redirect to home
              router.replace('/home');
            } else {
              console.error('Failed to submit inactivity reason');
              // Still redirect even if logging fails
              localStorage.removeItem('auto_logout');
              localStorage.removeItem('auto_logout_time');
              setShowInactivityModal(false);
              router.replace('/home');
            }
          } catch (error) {
            console.error('Error submitting inactivity reason:', error);
            // Still redirect even if there's an error
            localStorage.removeItem('auto_logout');
            localStorage.removeItem('auto_logout_time');
            setShowInactivityModal(false);
            router.replace('/home');
          }
        }}
        username={loggedInUsername}
      />
    </div>
  );
}

