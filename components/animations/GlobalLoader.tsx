'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

interface GlobalLoaderProps {
  isLoading: boolean;
  message?: string;
}

export default function GlobalLoader({ isLoading, message = 'Loading...' }: GlobalLoaderProps) {
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9998] flex items-center justify-center backdrop-blur-sm pointer-events-auto"
          style={{
            background: 'rgba(0, 0, 0, 0.3)',
          }}
        >
          {/* Blurred background overlay */}
          <div className="absolute inset-0 backdrop-blur-md" />

          {/* Loader content */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="relative z-10 flex flex-col items-center"
          >
            {/* Circular loader with brand colors */}
            <div className="relative w-24 h-24 mb-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'linear',
                }}
                className="absolute inset-0 border-4 border-transparent border-t-brand-primary border-r-brand-gold rounded-full"
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'linear',
                }}
                className="absolute inset-2 border-4 border-transparent border-b-brand-primary border-l-brand-gold rounded-full"
              />
            </div>

            {/* Mascot pop-up */}
            <motion.div
              initial={{ y: 20, opacity: 0, scale: 0.5 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.5 }}
              transition={{
                duration: 0.5,
                repeat: Infinity,
                repeatType: 'reverse',
                repeatDelay: 0.5,
              }}
              className="relative w-16 h-16 mb-2"
            >
              <Image
                src="/YNM_Mascot-removebg-preview.png"
                alt="YNM Mascot"
                fill
                sizes="64px"
                className="object-contain"
                priority
                unoptimized
              />
            </motion.div>

            {/* Loading message */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-white font-semibold text-lg"
              style={{
                textShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
              }}
            >
              {message}
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

