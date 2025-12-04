'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ButtonCarousel from "@/components/ui/ButtonCarousel";
import Image from "next/image";

export default function PriceEnginePage() {
  const router = useRouter();
  const [username, setUsername] = useState<string>(''); // Start empty to prevent flash
  const [department, setDepartment] = useState<string>('Sales');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
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
      
      // Authenticated - load username, department, and admin status
      const storedUsername = localStorage.getItem('username') || '';
      const storedDepartment = localStorage.getItem('department') || 'Sales';
      const storedIsAdmin = localStorage.getItem('isAdmin') === 'true';
      setUsername(storedUsername);
      setDepartment(storedDepartment);
      setIsAdmin(storedIsAdmin);
      setIsChecking(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // Don't render if still checking or not authenticated
  if (isChecking) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-start py-8 sm:py-12 md:py-20 pt-16 sm:pt-20 md:pt-32 pb-20 sm:pb-32 md:pb-40 relative px-2 sm:px-4">
      {/* Logout Button */}
      
      {/* User Greeting - Centered */}
      {username && (
        <div className="w-full flex justify-center mb-4 sm:mb-6 md:mb-8 relative z-10 px-2">
          <div className="glassmorphic-premium rounded-xl sm:rounded-2xl px-4 sm:px-6 md:px-8 py-2 sm:py-3 md:py-4 w-full max-w-md">
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold text-white text-center">
              Hi, welcome back <span className="text-brand-gold font-bold">{username}</span>
            </p>
          </div>
        </div>
      )}
      {/* Multi-layered glow effects behind logo - hidden on mobile for performance */}
      <div className="hidden md:block absolute top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-brand-gold/25 rounded-full blur-[100px] opacity-70 -z-0 animate-pulse"></div>
      <div className="hidden md:block absolute top-32 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-brand-primary/20 rounded-full blur-[80px] opacity-60 -z-0 animate-pulse" style={{ animationDelay: '1s' }}></div>
      
      {/* Logo with premium container */}
      <div className="w-full flex items-center justify-center mb-8 sm:mb-12 md:mb-20 relative z-10 px-2">
        <div className="glassmorphic-premium rounded-xl sm:rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-8 shadow-md card-hover-gold relative overflow-hidden group w-full max-w-md sm:max-w-lg">
          {/* Animated border glow */}
          <div className="absolute inset-0 rounded-xl sm:rounded-2xl md:rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="absolute inset-0 rounded-xl sm:rounded-2xl md:rounded-3xl bg-gradient-to-r from-brand-gold/30 via-brand-primary/30 to-brand-gold/30 blur-xl" />
          </div>
          
          <div className="relative z-10">
            <Image
              src="/LOGO.png"
              alt="YNM Safety Logo"
              width={360}
              height={160}
              className="object-contain w-full h-auto transform group-hover:scale-105 transition-transform duration-500"
              priority
              style={{ transition: 'none' }}
            />
          </div>
        </div>
      </div>

      {/* Main Title with enhanced glow */}
      <div className="w-full flex flex-col items-center mb-8 sm:mb-16 md:mb-32 scale-in relative z-10 title-glow px-2">
        <h1 
          className="text-3xl sm:text-5xl md:text-7xl lg:text-8xl xl:text-[10rem] font-extrabold text-white mb-4 sm:mb-6 md:mb-10 text-center tracking-tight drop-shadow-md text-neon-gold relative"
          style={{ 
            textShadow: '0 0 10px rgba(209, 168, 90, 0.3)', /* Reduced for performance */
            letterSpacing: '-0.02em'
          }}
        >
          Price Engine
        </h1>
        <div className="gold-divider w-full max-w-xs sm:max-w-md"></div>
      </div>

      {/* Button Cards Carousel Section */}
      <div className="w-full relative z-10 px-2 sm:px-4">
        {/* Heading */}
        <div className="text-center mb-6 sm:mb-8 md:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mb-2 sm:mb-3 md:mb-4 drop-shadow-md px-2">
            Choose Your Desired Option
          </h2>
          <p className="text-sm sm:text-base md:text-xl lg:text-2xl text-slate-300 font-medium px-2">
            Select the module you want to work with
          </p>
          <div className="gold-divider mt-4 sm:mt-6 w-full max-w-xs sm:max-w-md mx-auto"></div>
        </div>
        
        <ButtonCarousel
          items={(() => {
            // Sales Department - Price Engine
            // Admin: MBCB, Signages, Paint, Quotation History, and Quotation Status (price checking only, no save)
            if (isAdmin && username === 'Admin') {
              return [
                {
                  title: "Metal Beam Crash Barriers (MBCB)",
                  href: "/mbcb",
                  icon: "⚡"
                },
                {
                  title: "Signages",
                  href: "/signages",
                  icon: "🚦"
                },
                {
                  title: "Thermoplastic Paint",
                  href: "/paint",
                  icon: "🎨"
                },
                {
                  title: "Quotation History",
                  href: "/history",
                  icon: "📋"
                },
                {
                  title: "Quotation Status",
                  href: "/quotation-status",
                  icon: "📊"
                }
              ];
            }
            
            // MBCB User: Only price checking access - MBCB, Paint, Signages (no save functionality)
            if (username === 'MBCB') {
              return [
                {
                  title: "Metal Beam Crash Barriers (MBCB)",
                  href: "/mbcb",
                  icon: "⚡"
                },
                {
                  title: "Signages",
                  href: "/signages",
                  icon: "🚦"
                },
                {
                  title: "Thermoplastic Paint",
                  href: "/paint",
                  icon: "🎨"
                }
              ];
            }
            
            // Sales Employees (Sales_*): MBCB, Paints, Signages, Quotation History, Quotation Status Update
            if (username.startsWith('Sales_')) {
              return [
                {
                  title: "Metal Beam Crash Barriers (MBCB)",
                  href: "/mbcb",
                  icon: "⚡"
                },
                {
                  title: "Signages",
                  href: "/signages",
                  icon: "🚦"
                },
                {
                  title: "Thermoplastic Paint",
                  href: "/paint",
                  icon: "🎨"
                },
                {
                  title: "Quotation History",
                  href: "/history",
                  icon: "📋"
                },
                {
                  title: "Quotation Status Update",
                  href: "/quotation-status-update",
                  icon: "🔄"
                }
              ];
            }
            
            // Default: Show all options (for now)
            return [
              {
                title: "Metal Beam Crash Barriers (MBCB)",
                href: "/mbcb",
                icon: "⚡"
              },
              {
                title: "Signages",
                href: "/signages",
                icon: "🚦"
              },
              {
                title: "Thermoplastic Paint",
                href: "/paint",
                icon: "🎨"
              },
              {
                title: "Quotation History",
                href: "/history",
                icon: "📋"
              }
            ];
          })()}
        />
      </div>
    </div>
  );
}

