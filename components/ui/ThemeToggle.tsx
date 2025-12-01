'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Force apply theme class to html element
    if (mounted && theme) {
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
  };

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleToggle}
      className="relative p-3 rounded-full backdrop-blur-xl border-2 transition-all duration-300 shadow-2xl pointer-events-auto cursor-pointer z-[10000]"
      style={{
        background: isDark
          ? 'linear-gradient(135deg, rgba(116, 6, 13, 0.9) 0%, rgba(139, 10, 18, 0.9) 100%)'
          : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 238, 231, 0.95) 100%)',
        borderColor: isDark ? 'rgba(209, 168, 90, 0.5)' : 'rgba(116, 6, 13, 0.3)',
      }}
      aria-label="Toggle theme"
      type="button"
    >
      <motion.div
        animate={{ rotate: isDark ? 180 : 0 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        className="text-2xl"
      >
        {isDark ? '🌙' : '☀️'}
      </motion.div>
    </motion.button>
  );
}

