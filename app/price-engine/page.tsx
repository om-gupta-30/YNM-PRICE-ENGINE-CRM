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
    <div className="min-h-screen flex flex-col items-center justify-start py-20 pt-32 pb-40 relative">
      {/* Logout Button */}
      
      {/* User Greeting - Centered */}
      {username && (
        <div className="w-full flex justify-center mb-8 relative z-10">
          <div className="glassmorphic-premium rounded-2xl px-8 py-4">
            <p className="text-xl md:text-2xl font-semibold text-white text-center">
              Hi, welcome back <span className="text-brand-gold font-bold">{username}</span>
            </p>
          </div>
        </div>
      )}
      {/* Multi-layered glow effects behind logo */}
      <div className="absolute top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-brand-gold/25 rounded-full blur-[100px] opacity-70 -z-0 animate-pulse"></div>
      <div className="absolute top-32 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-brand-primary/20 rounded-full blur-[80px] opacity-60 -z-0 animate-pulse" style={{ animationDelay: '1s' }}></div>
      
      {/* Logo with premium container */}
      <div className="w-full flex items-center justify-center mb-20 relative z-10">
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

      {/* Main Title with enhanced glow */}
      <div className="w-full flex flex-col items-center mb-32 scale-in relative z-10 title-glow">
        <h1 
          className="text-8xl md:text-[10rem] font-extrabold text-white mb-10 text-center tracking-tight drop-shadow-2xl text-neon-gold relative"
          style={{ 
            textShadow: '0 0 40px rgba(209, 168, 90, 0.4), 0 0 80px rgba(209, 168, 90, 0.2), 0 0 120px rgba(116, 6, 13, 0.1)',
            letterSpacing: '-0.02em'
          }}
        >
          Price Engine
        </h1>
        <div className="gold-divider"></div>
      </div>

      {/* Button Cards Carousel Section */}
      <div className="w-full relative z-10 px-4">
        {/* Heading */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4 drop-shadow-2xl">
            Choose Your Desired Option
          </h2>
          <p className="text-xl md:text-2xl text-slate-300 font-medium">
            Select the module you want to work with
          </p>
          <div className="gold-divider mt-6"></div>
        </div>
        
        <ButtonCarousel
          items={(() => {
            // Sales Department - Price Engine
            // Admin: Only Quotation History and Quotation Status
            if (isAdmin && username === 'Admin') {
              return [
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
            
            // Employees (Employee1, Employee2, Employee3): MBCB, Paints, Signages, Quotation History, Quotation Status Update
            if (username === 'Employee1' || username === 'Employee2' || username === 'Employee3') {
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

