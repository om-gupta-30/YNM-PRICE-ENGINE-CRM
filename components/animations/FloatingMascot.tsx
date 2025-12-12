'use client';

import Image from 'next/image';
import { memo, useEffect, useRef, useState } from 'react';

function FloatingMascot() {
  const mascotRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [isOverContent, setIsOverContent] = useState(false);
  const [scrollYPosition, setScrollYPosition] = useState(80);
  const [scrollTarget, setScrollTarget] = useState(80);
  const [danceTransform, setDanceTransform] = useState('none');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleScroll = () => {
      setScrollTarget(window.scrollY + 80);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    let frame: number;
    let lastTime = 0;
    const smoothFollow = (currentTime: number) => {
      // Throttle to ~30fps for performance
      if (currentTime - lastTime >= 33) {
        setScrollYPosition(prev => {
          const lerp = prev + (scrollTarget - prev) * 0.15; // Slightly faster for responsiveness
          return lerp;
        });
        lastTime = currentTime;
      }
      frame = requestAnimationFrame(smoothFollow);
    };
    frame = requestAnimationFrame(smoothFollow);
    return () => cancelAnimationFrame(frame);
  }, [scrollTarget]);

  useEffect(() => {
    const dance = () => {
      const motions = [
        'rotate(2deg)',
        'rotate(-2deg)',
        'translateY(-4px)',
        'translateY(4px)',
      ];

      const random = motions[Math.floor(Math.random() * motions.length)];
      setDanceTransform(random);
    };

    const interval = setInterval(dance, 3000); // Reduced frequency for performance
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    
    const checkOverContent = () => {
      if (!mascotRef.current) return;

      const mascotRect = mascotRef.current.getBoundingClientRect();
      const mascotCenterX = mascotRect.left + mascotRect.width / 2;
      const mascotCenterY = mascotRect.top + mascotRect.height / 2;

      // Check if mascot is over any interactive content (cards, buttons, inputs)
      const elements = document.elementsFromPoint(mascotCenterX, mascotCenterY);
      const isOverInteractive = elements.some(el => {
        const tagName = el.tagName.toLowerCase();
        const className = el.className || '';
        return (
          tagName === 'input' ||
          tagName === 'button' ||
          tagName === 'select' ||
          tagName === 'textarea' ||
          className.includes('glassmorphic') ||
          className.includes('card') ||
          className.includes('btn-')
        );
      });

      setIsOverContent(isOverInteractive);
      setScale(isOverInteractive ? 0.4 : 1);
    };

    const interval = setInterval(checkOverContent, 300); // Reduced frequency for performance
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      ref={mascotRef}
      className="fixed pointer-events-none"
      style={{
        width: '200px',
        height: '200px',
        zIndex: 9999,
        top: scrollYPosition,
        right: 40,
        pointerEvents: 'none',
        transition: 'transform 0.3s ease-out',
        willChange: 'transform, top',
        transform: `${danceTransform} scale(${scale})`,
      }}
    >
      <div
        className="relative w-full h-full mascot-float"
        style={{ 
          position: 'relative', 
          width: '100%', 
          height: '100%',
        }}
      >
        {/* Mascot image - purely decorative, optimized */}
        <div
          className="relative w-full h-full pointer-events-none animate-expand-sides"
          style={{ 
            position: 'relative', 
            width: '100%', 
            height: '100%',
            transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: isOverContent ? 'scale(0.5)' : 'scale(1)',
            opacity: isOverContent ? 0.6 : 1,
          }}
        >
          <Image
            src="/YNM_Mascot-removebg-preview.png"
            alt="YNM Mascot"
            fill
            sizes="200px"
            className="object-contain"
            priority={false}
            loading="lazy"
            unoptimized
            style={{
              pointerEvents: 'none',
            }}
          />
        </div>
      </div>
    </div>
  );
}

// Memoize to prevent re-renders
export default memo(FloatingMascot);
