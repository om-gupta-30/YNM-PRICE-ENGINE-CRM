'use client';

import { useRef } from 'react';
import Image from 'next/image';
import styles from './ShowcaseSection.module.css';

export default function ShowcaseSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  // All parallax animations disabled for performance

  return (
    <section
      ref={sectionRef}
      className={`${styles.showcaseSection} relative w-full h-screen overflow-hidden`}
      style={{ minHeight: '100vh' }}
    >
      {/* Background Image - static for performance */}
      <div className="absolute inset-0 z-0">
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
      </div>

      {/* Left Title - static for performance */}
      <div className="absolute top-20 left-8 md:left-16 z-20">
        <div className="text-white/80 uppercase tracking-[0.3em] text-sm md:text-base font-light">
          <div>SERVICES /</div>
          <div className="mt-2 text-white/90">WEB DESIGN</div>
        </div>
      </div>

      {/* Right Title - static for performance */}
      <div className="absolute top-20 right-8 md:right-16 z-20 text-right">
        <div className="text-white/80 uppercase tracking-[0.3em] text-sm md:text-base font-light">
          <div>FIELD /</div>
          <div className="mt-2 text-white/90">HOSPITALITY</div>
        </div>
      </div>

      {/* Left Phone Mockup - static for performance */}
      <div className="absolute left-[10%] md:left-[15%] top-1/2 -translate-y-1/2 z-10">
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
      </div>

      {/* Right Phone Mockup - static for performance */}
      <div className="absolute right-[10%] md:right-[15%] top-1/2 -translate-y-1/2 z-10">
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
      </div>
    </section>
  );
}
