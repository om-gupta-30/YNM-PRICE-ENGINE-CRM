'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

interface LandingAnimationProps {
  onComplete: () => void;
}

export default function LandingAnimation({ onComplete }: LandingAnimationProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        onComplete();
      }, 200); // Reduced from 500ms to 200ms
    }, 1000); // Reduced from 2 seconds to 1 second

    return () => clearTimeout(timer);
  }, [onComplete]);

  // Particle positions
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 2,
    duration: Math.random() * 3 + 2,
    delay: Math.random() * 2,
  }));

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden pointer-events-auto"
          style={{
            background: 'linear-gradient(135deg, #f8eee7 0%, rgba(116, 6, 13, 0.1) 50%, rgba(209, 168, 90, 0.15) 100%)',
          }}
        >
          {/* Animated particles */}
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute rounded-full"
              style={{
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                background: 'radial-gradient(circle, rgba(209, 168, 90, 0.6) 0%, rgba(116, 6, 13, 0.3) 100%)',
              }}
              animate={{
                y: [0, -30, 0],
                x: [0, Math.random() * 20 - 10, 0],
                opacity: [0.3, 0.8, 0.3],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: particle.duration,
                delay: particle.delay,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          ))}

          {/* Main content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1, y: -50 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="flex flex-col items-center justify-center relative z-10"
          >
            {/* Mascot animation */}
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.5 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 1.2, x: 100 }}
              transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
              className="relative w-48 h-48 mb-8"
            >
              <Image
                src="/YNM_Mascot-removebg-preview.png"
                alt="YNM Mascot"
                fill
                sizes="192px"
                className="object-contain drop-shadow-2xl"
                priority
                unoptimized
                style={{
                  filter: 'drop-shadow(0 20px 60px rgba(116, 6, 13, 0.5)) drop-shadow(0 10px 30px rgba(209, 168, 90, 0.4))',
                }}
              />
            </motion.div>

            {/* Company name */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-5xl md:text-7xl font-extrabold text-brand-primary mb-2"
              style={{
                textShadow: '0 0 40px rgba(116, 6, 13, 0.4), 0 0 80px rgba(116, 6, 13, 0.2)',
                letterSpacing: '-0.02em',
              }}
            >
              YNM SAFETY
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="text-xl md:text-2xl text-brand-primary/80 font-semibold"
            >
              Price Engine
            </motion.p>
          </motion.div>

          {/* Shimmer effect */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(209, 168, 90, 0.3) 50%, transparent 100%)',
            }}
            animate={{
              x: ['-100%', '200%'],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

