'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import Image from 'next/image';
import styles from './ShowcaseSection.module.css';

export default function ShowcaseSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });

  // Parallax transforms for background
  const backgroundY = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const backgroundOpacity = useTransform(scrollYProgress, [0, 0.5, 1], [1, 1, 0.8]);

  // Phone animations - left phone
  const leftPhoneY = useTransform(scrollYProgress, [0, 1], ['0%', '-15%']);
  const leftPhoneRotateY = useTransform(scrollYProgress, [0, 0.5, 1], [-10, -8, -12]);
  const leftPhoneRotateX = useTransform(scrollYProgress, [0, 0.5, 1], [0, 2, -2]);
  const leftPhoneScale = useTransform(scrollYProgress, [0, 0.5, 1], [1, 1.03, 1]);

  // Phone animations - right phone
  const rightPhoneY = useTransform(scrollYProgress, [0, 1], ['0%', '-20%']);
  const rightPhoneRotateY = useTransform(scrollYProgress, [0, 0.5, 1], [10, 12, 8]);
  const rightPhoneRotateX = useTransform(scrollYProgress, [0, 0.5, 1], [0, -2, 2]);
  const rightPhoneScale = useTransform(scrollYProgress, [0, 0.5, 1], [1, 1.03, 1]);

  return (
    <section
      ref={sectionRef}
      className={`${styles.showcaseSection} relative w-full h-screen overflow-hidden`}
      style={{ minHeight: '100vh' }}
    >
      {/* Background Image with Parallax */}
      <motion.div
        className="absolute inset-0 z-0"
        style={{
          y: backgroundY,
          opacity: backgroundOpacity,
        }}
      >
        <div className="relative w-full h-[120%]">
          <Image
            src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80"
            alt="Showcase Background"
            fill
            className="object-cover"
            priority
          />
          {/* Soft fade overlays */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
        </div>
      </motion.div>

      {/* Left Title */}
      <motion.div
        className="absolute top-20 left-8 md:left-16 z-20"
        initial={{ opacity: 0, x: -30 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <div className="text-white/80 uppercase tracking-[0.3em] text-sm md:text-base font-light">
          <div>SERVICES /</div>
          <div className="mt-2 text-white/90">WEB DESIGN</div>
        </div>
      </motion.div>

      {/* Right Title */}
      <motion.div
        className="absolute top-20 right-8 md:right-16 z-20 text-right"
        initial={{ opacity: 0, x: 30 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <div className="text-white/80 uppercase tracking-[0.3em] text-sm md:text-base font-light">
          <div>FIELD /</div>
          <div className="mt-2 text-white/90">HOSPITALITY</div>
        </div>
      </motion.div>

      {/* Left Phone Mockup */}
      <motion.div
        className="absolute left-[10%] md:left-[15%] top-1/2 -translate-y-1/2 z-10"
        style={{
          y: leftPhoneY,
          rotateY: leftPhoneRotateY,
          rotateX: leftPhoneRotateX,
          scale: leftPhoneScale,
          transformStyle: 'preserve-3d',
        }}
        initial={{ opacity: 0, y: 100 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 1, delay: 0.3 }}
      >
        <div className={styles.showcasePhoneFrame}>
          <div className={styles.showcasePhoneScreen}>
            <Image
              src="https://images.unsplash.com/photo-1551650975-87deedd944c3?w=400&q=80"
              alt="Mobile UI Mockup"
              width={200}
              height={400}
              className="object-cover rounded-[20px] w-full h-full"
            />
          </div>
        </div>
      </motion.div>

      {/* Right Phone Mockup */}
      <motion.div
        className="absolute right-[10%] md:right-[15%] top-1/2 -translate-y-1/2 z-10"
        style={{
          y: rightPhoneY,
          rotateY: rightPhoneRotateY,
          rotateX: rightPhoneRotateX,
          scale: rightPhoneScale,
          transformStyle: 'preserve-3d',
        }}
        initial={{ opacity: 0, y: 100 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 1, delay: 0.5 }}
      >
        <div className={styles.showcasePhoneFrame}>
          <div className={styles.showcasePhoneScreen}>
            <Image
              src="https://images.unsplash.com/photo-1551434678-e076c223a692?w=400&q=80"
              alt="Mobile UI Mockup"
              width={200}
              height={400}
              className="object-cover rounded-[20px] w-full h-full"
            />
          </div>
        </div>
      </motion.div>
    </section>
  );
}
