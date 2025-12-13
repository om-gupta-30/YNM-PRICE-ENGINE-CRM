'use client';

import { useEffect } from 'react';
import { initPerformanceOptimizations } from '@/lib/utils/performanceOptimizations';

/**
 * Performance Optimizer Component
 * Initializes performance optimizations on page load
 * Should be placed in root layout
 */
export default function PerformanceOptimizer() {
  useEffect(() => {
    // Initialize all performance optimizations
    initPerformanceOptimizations();
  }, []);

  return null; // This component doesn't render anything
}

