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
        {/* Simplified - no animated background for performance */}
        <div>
          {icon && (
            <div 
              className="text-8xl mb-8 filter drop-shadow-2xl relative z-10"
            >
              {icon}
            </div>
          )}
          <h2 className="module-card-title text-4xl font-extrabold text-white group-hover:text-premium-gold transition-colors duration-200 tracking-tight drop-shadow-2xl relative z-10">
            {title}
          </h2>
        </div>
      </div>
    </Link>
  );
});

export default ButtonCard;
