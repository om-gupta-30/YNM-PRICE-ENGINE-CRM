'use client';

import { useState } from 'react';

interface PageHelpNoteProps {
  title: string;
  description: string;
  hints?: string[];
  className?: string;
}

export default function PageHelpNote({ title, description, hints = [], className = '' }: PageHelpNoteProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`relative inline-flex ${className}`}>
      <button
        type="button"
        aria-label={`About ${title}`}
        onClick={() => setOpen(prev => !prev)}
        className={`w-11 h-11 rounded-full border border-white/20 bg-white/5 text-white flex items-center justify-center shadow-lg shadow-black/20 transition hover:border-white/40 ${
          open ? 'backdrop-blur-md' : ''
        }`}
      >
        <span className="text-lg font-bold">?</span>
      </button>
      {open && (
        <div className="absolute right-0 top-14 w-72 sm:w-80 bg-[#12081f]/95 border border-white/15 rounded-3xl p-5 shadow-2xl shadow-black/40 z-20">
          <div className="flex items-center justify-between gap-3 mb-3">
            <p className="text-sm uppercase tracking-[0.35em] text-white/50">Guide</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-white/60 text-xs hover:text-white/90 transition"
            >
              Close
            </button>
          </div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <p className="text-sm text-white/70 mt-2">{description}</p>
          {hints.length > 0 && (
            <ul className="mt-3 space-y-2 text-sm text-white/70">
              {hints.map((hint, index) => (
                <li key={index} className="flex gap-2">
                  <span className="text-premium-gold text-base leading-5">•</span>
                  <span>{hint}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

