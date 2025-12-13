import { useState, useEffect } from 'react';
import { getOptimalDebounceDelay } from '@/lib/utils/performanceOptimizations';

/**
 * Debounce hook with automatic delay optimization based on device performance
 * Uses shorter delays on fast devices, longer delays on slow devices (Windows laptops)
 */
export function useDebounce<T>(value: T, delay?: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  // Use optimal delay if not specified, based on device performance
  const optimalDelay = delay ?? getOptimalDebounceDelay();

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

