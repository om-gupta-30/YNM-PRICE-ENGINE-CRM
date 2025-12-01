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
    <Link href={href} className="block w-full group">
      <div 
        className="glassmorphic-premium rounded-lg p-3 sm:p-4 cursor-pointer flex flex-row items-center justify-start gap-3 sm:gap-4 card-hover-gold relative w-full min-h-[56px] sm:min-h-[64px] md:min-h-[70px] touch-manipulation"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        {/* Animated background gradient */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-premium-gold/10 via-transparent to-[#6A5AF9]/10" />
        </div>
        
        {icon && (
          <div 
            className="text-2xl sm:text-3xl md:text-4xl filter drop-shadow-md relative z-10 flex-shrink-0"
            style={{ 
              textShadow: '0 0 10px rgba(212, 166, 90, 0.3)', /* Reduced for performance */
            }}
          >
            {icon}
          </div>
        )}
        <div 
          className="flex-1 relative z-10 min-w-0"
        >
          <h2 
            className="text-sm sm:text-base md:text-lg font-bold text-white group-hover:text-premium-gold transition-colors duration-200 tracking-tight drop-shadow-md leading-tight whitespace-nowrap"
          >
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
