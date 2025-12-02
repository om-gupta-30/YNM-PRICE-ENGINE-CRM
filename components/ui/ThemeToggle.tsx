'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Force apply theme class to html element
    if (mounted && theme && typeof document !== 'undefined') {
      const root = document.documentElement;
      const body = document.body;
      if (theme === 'dark') {
        root.classList.add('dark');
        root.style.colorScheme = 'dark';
        body.style.backgroundColor = '#0d0405';
        body.style.color = '#F1F5F9';
      } else {
        root.classList.remove('dark');
        root.style.colorScheme = 'light';
        body.style.backgroundColor = '#d4c4b0';
        body.style.color = '#2a1a1a';
      }
    }
  }, [theme, mounted]);

  if (!mounted) {
    return (
      <div className="relative p-3 rounded-full backdrop-blur-xl border-2 pointer-events-auto opacity-0">
        <div className="text-2xl">☀️</div>
      </div>
    );
  }

  const isDark = theme === 'dark' || resolvedTheme === 'dark';

  const handleToggle = () => {
    const newTheme = isDark ? 'light' : 'dark';
    setTheme(newTheme);
    // Force update immediately - apply to html element
    if (typeof document !== 'undefined') {
    const root = document.documentElement;
    if (newTheme === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
    // Also update body for immediate visual feedback
    const body = document.body;
    if (newTheme === 'dark') {
      body.style.backgroundColor = '#0d0405';
      body.style.color = '#F1F5F9';
    } else {
      body.style.backgroundColor = '#d4c4b0';
      body.style.color = '#2a1a1a';
      }
    }
  };

  return (
    <button
      onClick={handleToggle}
      className="relative p-2 sm:p-3 rounded-full backdrop-blur-sm border-2 transition-all duration-200 shadow-lg pointer-events-auto cursor-pointer z-[10000] touch-manipulation"
      style={{
        background: isDark
          ? 'linear-gradient(135deg, rgba(116, 6, 13, 0.9) 0%, rgba(139, 10, 18, 0.9) 100%)'
          : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 238, 231, 0.95) 100%)',
        borderColor: isDark ? 'rgba(209, 168, 90, 0.5)' : 'rgba(116, 6, 13, 0.3)',
        minHeight: '44px',
        minWidth: '44px',
        WebkitTapHighlightColor: 'transparent',
      }}
      aria-label="Toggle theme"
      type="button"
    >
      <div className="text-xl sm:text-2xl">
        {isDark ? '🌙' : '☀️'}
      </div>
    </button>
  );
}

