'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from "next/image";

export default function HomePage() {
  const router = useRouter();
  const [username, setUsername] = useState<string>('');
  const [isDataAnalyst, setIsDataAnalyst] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check authentication first
      const auth = localStorage.getItem('auth');
      if (auth !== 'true') {
        // Not authenticated - redirect to login
        router.replace('/login');
        return;
      }
      
      // Check if data analyst - redirect to CRM
      const isDataAnalystUser = localStorage.getItem('isDataAnalyst') === 'true';
      if (isDataAnalystUser) {
        router.replace('/crm');
        return;
      }
      
      // Authenticated - load username
      const storedUsername = localStorage.getItem('username') || '';
      setUsername(storedUsername);
      setIsDataAnalyst(isDataAnalystUser);
      setIsChecking(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // Don't render if still checking or not authenticated
  if (isChecking) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-20 px-4 relative">
      {/* Multi-layered glow effects behind logo */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-gold/25 rounded-full blur-[100px] opacity-70 -z-0 animate-pulse"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-brand-primary/20 rounded-full blur-[80px] opacity-60 -z-0 animate-pulse" style={{ animationDelay: '1s' }}></div>
      
      {/* Logo with premium container */}
      <div className="w-full flex items-center justify-center mb-16 relative z-10">
        <div className="glassmorphic-premium rounded-3xl p-8 shadow-2xl card-hover-gold relative overflow-hidden group">
          {/* Animated border glow */}
          <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-brand-gold/30 via-brand-primary/30 to-brand-gold/30 blur-xl" />
          </div>
          
          <div className="relative z-10">
            <Image
              src="/LOGO.png"
              alt="YNM Safety Logo"
              width={360}
              height={160}
              className="object-contain transform group-hover:scale-105 transition-transform duration-500"
              priority
              style={{ transition: 'none' }}
            />
          </div>
        </div>
      </div>

      {/* User Greeting */}
      {username && (
        <div className="w-full flex justify-center mb-12 relative z-10">
          <div className="glassmorphic-premium rounded-2xl px-8 py-4">
            <p className="text-xl md:text-2xl font-semibold text-white text-center">
              Hi, welcome back <span className="text-brand-gold font-bold">{username}</span>
            </p>
          </div>
        </div>
      )}

      {/* Main Title */}
      <div className="w-full flex flex-col items-center mb-16 scale-in relative z-10 title-glow">
        <h1 
          className="text-6xl md:text-8xl font-extrabold text-white mb-6 text-center tracking-tight drop-shadow-2xl text-neon-gold relative"
          style={{ 
            textShadow: '0 0 40px rgba(209, 168, 90, 0.4), 0 0 80px rgba(209, 168, 90, 0.2), 0 0 120px rgba(116, 6, 13, 0.1)',
            letterSpacing: '-0.02em'
          }}
        >
          Choose Your System
        </h1>
        <div className="gold-divider"></div>
      </div>

      {/* Two Large Buttons */}
      <div className={`w-full max-w-4xl mx-auto grid gap-8 relative z-10 px-4 ${isDataAnalyst ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
        {/* Price Engine Button - Hidden for data analysts */}
        {!isDataAnalyst && (
          <button
            onClick={() => router.push('/price-engine')}
            className="glassmorphic-premium rounded-3xl p-12 shadow-2xl card-hover-gold relative overflow-hidden group transition-all duration-300 hover:scale-105"
            style={{
              minHeight: '300px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1.5rem'
            }}
          >
            {/* Animated border glow */}
            <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-brand-gold/30 via-brand-primary/30 to-brand-gold/30 blur-xl" />
            </div>
            
            <div className="relative z-10 text-center">
              <div className="text-6xl mb-4">⚡</div>
              <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4 drop-shadow-lg">
                Price Engine
              </h2>
              <p className="text-lg text-slate-300 font-medium">
                Access quotation tools and price calculations
              </p>
            </div>
          </button>
        )}

        {/* CRM Button */}
        <button
          onClick={() => router.push('/crm')}
          className="glassmorphic-premium rounded-3xl p-12 shadow-2xl card-hover-gold relative overflow-hidden group transition-all duration-300 hover:scale-105"
          style={{
            minHeight: '300px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1.5rem'
          }}
        >
          {/* Animated border glow */}
          <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-brand-gold/30 via-brand-primary/30 to-brand-gold/30 blur-xl" />
          </div>
          
          <div className="relative z-10 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4 drop-shadow-lg">
              CRM
            </h2>
            <p className="text-lg text-slate-300 font-medium">
              Customer relationship management system
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}

