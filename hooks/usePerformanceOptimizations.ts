'use client';

import { useEffect, useMemo, useCallback } from 'react';
import { 
  debounce, 
  throttle, 
  getOptimalDebounceDelay, 
  getOptimalThrottleDelay,
  shouldReduceAnimations,
  initPerformanceOptimizations 
} from '@/lib/utils/performanceOptimizations';

/**
 * Hook for performance optimizations
 * Automatically optimizes based on device capabilities
 */
export function usePerformanceOptimizations() {
  useEffect(() => {
    // Initialize performance optimizations on mount
    initPerformanceOptimizations();
  }, []);

  // Get optimal delays based on device
  const debounceDelay = useMemo(() => getOptimalDebounceDelay(), []);
  const throttleDelay = useMemo(() => getOptimalThrottleDelay(), []);
  const reduceAnimations = useMemo(() => shouldReduceAnimations(), []);

  // Create optimized debounce function
  const useDebounce = useCallback(<T extends (...args: any[]) => any>(
    func: T
  ): ((...args: Parameters<T>) => void) => {
    return debounce(func, debounceDelay);
  }, [debounceDelay]);

  // Create optimized throttle function
  const useThrottle = useCallback(<T extends (...args: any[]) => any>(
    func: T
  ): ((...args: Parameters<T>) => void) => {
    return throttle(func, throttleDelay);
  }, [throttleDelay]);

  return {
    debounceDelay,
    throttleDelay,
    reduceAnimations,
    useDebounce,
    useThrottle,
  };
}

/**
 * Hook for debounced input values
 * Reduces re-renders and API calls
 */
export function useDebouncedValue<T>(value: T, delay?: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);
  const optimalDelay = delay || getOptimalDebounceDelay();

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, optimalDelay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, optimalDelay]);

  return debouncedValue;
}

// Fix React import
import React from 'react';

