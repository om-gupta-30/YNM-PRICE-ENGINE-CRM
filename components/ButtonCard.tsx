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
    <Link href={href} className="block h-full group">
      <div 
        className="glassmorphic-premium rounded-3xl p-16 text-center cursor-pointer h-full flex flex-col items-center justify-center min-h-[320px] stagger-reveal card-hover-gold relative overflow-hidden"
        style={{ animationDelay: delay }}
      >
        {/* Animated background gradient */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-premium-gold/10 via-transparent to-[#6A5AF9]/10" />
        </div>
        
        {icon && (
          <div 
            className="text-8xl mb-8 filter drop-shadow-2xl relative z-10 transform group-hover:scale-110 group-hover:rotate-6"
            style={{ 
              transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)', /* Reduced from 0.5s to 0.3s */
              textShadow: '0 0 30px rgba(212, 166, 90, 0.5), 0 0 60px rgba(106, 90, 249, 0.3)',
              willChange: 'transform'
            }}
          >
            {icon}
          </div>
        )}
        <h2 className="text-4xl font-extrabold text-white group-hover:text-premium-gold transition-colors duration-300 tracking-tight drop-shadow-2xl relative z-10 transform group-hover:scale-105" style={{ transition: 'color 0.3s ease, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)', willChange: 'transform' }}>
          {title}
        </h2>
        
        {/* Shimmer effect on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 animate-shimmer" />
        </div>
      </div>
    </Link>
  );
});

export default ButtonCard;
