'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useUser } from '@/contexts/UserContext';

export default function ChangePasswordPage() {
  const router = useRouter();
  const { username } = useUser();
  const [userId, setUserId] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [captcha, setCaptcha] = useState('');
  const [userCaptcha, setUserCaptcha] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Generate captcha on mount and when needed
  useEffect(() => {
    generateCaptcha();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generateCaptcha = () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Generate random 5-character captcha
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let captchaText = '';
    for (let i = 0; i < 5; i++) {
      captchaText += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptcha(captchaText);

    // Set canvas background
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw captcha text with random colors and positions
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < captchaText.length; i++) {
      const x = (canvas.width / (captchaText.length + 1)) * (i + 1);
      const y = canvas.height / 2 + (Math.random() - 0.5) * 10;
      const angle = (Math.random() - 0.5) * 0.5;
      
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillStyle = `hsl(${Math.random() * 60 + 40}, 70%, ${Math.random() * 30 + 50}%)`;
      ctx.fillText(captchaText[i], 0, 0);
      ctx.restore();
    }

    // Add noise lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.stroke();
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    // Validation
    if (!userId || !oldPassword || !newPassword || !confirmPassword || !userCaptcha) {
      setError('All fields are required');
      setIsLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match');
      setIsLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      setIsLoading(false);
      return;
    }

    // Password strength validation
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);

    if (!hasUpperCase) {
      setError('Password must contain at least one uppercase letter (A-Z)');
      setIsLoading(false);
      return;
    }

    if (!hasNumber) {
      setError('Password must contain at least one number (0-9)');
      setIsLoading(false);
      return;
    }

    if (!hasSpecialChar) {
      setError('Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)');
      setIsLoading(false);
      return;
    }

    if (userCaptcha.toUpperCase() !== captcha.toUpperCase()) {
      setError('Invalid captcha. Please try again.');
      generateCaptcha();
      setUserCaptcha('');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          oldPassword,
          newPassword,
          captcha: userCaptcha,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to change password');
        generateCaptcha();
        setUserCaptcha('');
        setIsLoading(false);
        return;
      }

      setSuccess('Password changed successfully! Redirecting to login...');
      
      // Clear form
      setUserId('');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setUserCaptcha('');
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        localStorage.removeItem('auth');
        localStorage.removeItem('username');
        router.replace('/login');
      }, 2000);
    } catch (error) {
      console.error('Change password error:', error);
      setError('An error occurred. Please try again.');
      generateCaptcha();
      setUserCaptcha('');
      setIsLoading(false);
    }
  };

  // Auto-fill userId from context if available
  useEffect(() => {
    if (username) {
      setUserId(username);
    }
  }, [username]);

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 relative">
      {/* Background glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-gold/25 rounded-full blur-[100px] opacity-70 -z-0 animate-pulse"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-brand-primary/20 rounded-full blur-[80px] opacity-60 -z-0 animate-pulse" style={{ animationDelay: '1s' }}></div>

      {/* Change Password Card */}
      <div className="w-full max-w-md relative z-10 fade-up">
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
            <h1 
              className="text-4xl md:text-5xl font-extrabold text-white mb-2 tracking-tight drop-shadow-2xl text-neon-gold"
              style={{ 
                textShadow: '0 0 40px rgba(209, 168, 90, 0.4), 0 0 80px rgba(209, 168, 90, 0.2)',
                letterSpacing: '-0.02em'
              }}
            >
              Change Password
            </h1>
            <div className="gold-divider mx-auto"></div>
          </div>

          {/* Change Password Form */}
          <form onSubmit={handleChangePassword} className="space-y-6">
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

            {/* Old Password Input */}
            <div>
              <label htmlFor="oldPassword" className="block text-sm font-semibold text-slate-200 mb-3">
                Current Password
              </label>
              <div className="relative">
                <input
                  id="oldPassword"
                  type={showOldPassword ? "text" : "password"}
                  value={oldPassword}
                  onChange={(e) => {
                    setOldPassword(e.target.value);
                    setError('');
                  }}
                  className="input-premium w-full px-6 py-4 pr-12 text-white placeholder:text-slate-400"
                  placeholder="Enter your current password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showOldPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            {/* New Password Input */}
            <div>
              <label htmlFor="newPassword" className="block text-sm font-semibold text-slate-200 mb-3">
                New Password
              </label>
              <div className="relative">
                <input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setError('');
                  }}
                  className="input-premium w-full px-6 py-4 pr-12 text-white placeholder:text-slate-400"
                  placeholder="Enter new password (min 6 characters)"
                  required
                  autoComplete="new-password"
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showNewPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              <div className="mt-2 text-xs text-slate-400 space-y-1">
                <p>Password must contain:</p>
                <div className="space-y-0.5 ml-2">
                  <p>• At least 6 characters</p>
                  <p>• One uppercase letter (A-Z)</p>
                  <p>• One number (0-9)</p>
                  <p>• One special character (!@#$%^&*()_+-=[]{}|;:,.{'<>'}?)</p>
                </div>
              </div>
            </div>

            {/* Confirm Password Input */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-200 mb-3">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError('');
                  }}
                  className="input-premium w-full px-6 py-4 pr-12 text-white placeholder:text-slate-400"
                  placeholder="Confirm new password"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            {/* Captcha */}
            <div>
              <label htmlFor="captcha" className="block text-sm font-semibold text-slate-200 mb-3">
                Enter Captcha
              </label>
              <div className="flex items-center gap-4">
                <canvas
                  ref={canvasRef}
                  width={150}
                  height={50}
                  className="border-2 border-brand-gold/50 rounded-lg bg-slate-800 cursor-pointer"
                  onClick={generateCaptcha}
                  title="Click to refresh captcha"
                />
                <button
                  type="button"
                  onClick={generateCaptcha}
                  className="text-sm text-brand-gold hover:text-brand-gold/80 transition-colors"
                >
                  🔄 Refresh
                </button>
              </div>
              <input
                id="captcha"
                type="text"
                value={userCaptcha}
                onChange={(e) => {
                  setUserCaptcha(e.target.value.toUpperCase());
                  setError('');
                }}
                className="input-premium w-full px-6 py-4 text-white placeholder:text-slate-400 mt-3"
                placeholder="Enter captcha"
                required
                maxLength={5}
                autoComplete="off"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/20 border border-red-400/50 rounded-xl p-4 backdrop-blur-sm animate-fade-up">
                <p className="text-red-200 text-sm font-medium text-center">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="bg-green-500/20 border border-green-400/50 rounded-xl p-4 backdrop-blur-sm animate-fade-up">
                <p className="text-green-200 text-sm font-medium text-center">{success}</p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex flex-col gap-3">
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
                    Changing Password...
                  </span>
                ) : (
                  'Change Password'
                )}
              </button>
              
              <button
                type="button"
                onClick={() => router.back()}
                className="text-slate-300 hover:text-white text-sm transition-colors"
              >
                ← Back
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

