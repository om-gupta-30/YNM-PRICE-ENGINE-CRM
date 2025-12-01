'use client';

import { memo } from 'react';

const Footer = memo(function Footer() {
  return (
    <footer className="w-full py-8 px-4 relative z-10 mt-auto" style={{ transform: 'translateZ(0)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="glassmorphic-premium rounded-2xl px-8 py-6 text-center border border-white/10">
          <p className="text-slate-300 text-sm font-medium">
            © {new Date().getFullYear()} YNM Safety Pvt Ltd
          </p>
        </div>
      </div>
    </footer>
  );
});

export default Footer;
