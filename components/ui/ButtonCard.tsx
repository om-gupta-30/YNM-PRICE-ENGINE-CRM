'use client';

import Link from "next/link";
import { memo } from "react";

interface ButtonCardProps {
  title: string;
  href: string;
  icon?: string;
  delay?: string;
}

const ButtonCard = memo(function ButtonCard({ title, href, icon, delay = "0ms" }: ButtonCardProps) {
  return (
    <Link href={href} className="block h-full group module-card">
      <div 
        className="glassmorphic-premium rounded-3xl p-16 text-center cursor-pointer h-full w-full flex flex-col items-center justify-center stagger-reveal card-hover-gold relative overflow-visible card-3d card-depth transform transition-all duration-500"
        style={{ animationDelay: delay }}
      >
        {/* Animated background gradient */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-gold/10 via-transparent to-brand-primary/10" />
        </div>
        
        <div className="parallax-inner">
          {icon && (
            <div 
              className="text-8xl mb-8 filter drop-shadow-2xl relative z-10 transform group-hover:scale-110 group-hover:rotate-6"
              style={{ 
                transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                textShadow: '0 0 30px rgba(209, 168, 90, 0.5), 0 0 60px rgba(116, 6, 13, 0.3)',
                willChange: 'transform'
              }}
            >
              {icon}
            </div>
          )}
          <h2 className="module-card-title text-4xl font-extrabold text-white group-hover:text-premium-gold transition-colors duration-300 tracking-tight drop-shadow-2xl relative z-10 transform group-hover:scale-105" style={{ transition: 'color 0.3s ease, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)', willChange: 'transform' }}>
            {title}
          </h2>
        </div>
        
        {/* Shimmer effect on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 animate-shimmer" />
        </div>
      </div>
    </Link>
  );
});

export default ButtonCard;
