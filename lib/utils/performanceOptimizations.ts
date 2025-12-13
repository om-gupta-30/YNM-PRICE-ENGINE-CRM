/**
 * Performance Optimizations for Windows Laptops and Slow Devices
 * 
 * This file contains utilities to optimize performance across the entire website,
 * especially for Windows laptop users who may have slower devices.
 */

/**
 * Throttle function calls to reduce excessive re-renders
 * Useful for scroll events, resize events, etc.
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  let previous = 0;

  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now();
    const remaining = wait - (now - previous);

    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      func.apply(this, args);
    } else if (!timeout) {
      timeout = setTimeout(() => {
        previous = Date.now();
        timeout = null;
        func.apply(this, args);
      }, remaining);
    }
  };
}

/**
 * Debounce function calls to reduce API calls and re-renders
 * Useful for input fields, search boxes, etc.
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function (this: any, ...args: Parameters<T>) {
    const context = this;
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(context, args);
    }, wait);
  };
}

/**
 * Request Animation Frame throttle for smooth animations
 * Better performance than regular throttle for visual updates
 */
export function rafThrottle<T extends (...args: any[]) => any>(
  func: T
): (...args: Parameters<T>) => void {
  let rafId: number | null = null;
  let lastArgs: Parameters<T> | null = null;

  return function (this: any, ...args: Parameters<T>) {
    lastArgs = args;
    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        if (lastArgs) {
          func.apply(this, lastArgs);
        }
        rafId = null;
        lastArgs = null;
      });
    }
  };
}

/**
 * Lazy load images with intersection observer
 * Reduces initial page load time
 */
export function lazyLoadImages() {
  if (typeof window === 'undefined') return;

  const images = document.querySelectorAll('img[data-src]');
  if (images.length === 0) return;

  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        const src = img.getAttribute('data-src');
        if (src) {
          img.src = src;
          img.removeAttribute('data-src');
          observer.unobserve(img);
        }
      }
    });
  });

  images.forEach(img => imageObserver.observe(img));
}

/**
 * Optimize scroll performance by using passive event listeners
 */
export function optimizeScrollPerformance() {
  if (typeof window === 'undefined') return;

  // Use passive event listeners for better scroll performance
  const options = { passive: true };
  
  // Add to all scrollable elements
  document.addEventListener('scroll', () => {}, options);
  document.addEventListener('touchstart', () => {}, options);
  document.addEventListener('touchmove', () => {}, options);
}

/**
 * Batch state updates to reduce re-renders
 * Useful when updating multiple state values at once
 */
export function batchStateUpdates(updates: (() => void)[]) {
  // React 18+ automatically batches, but this helps with older patterns
  if (typeof window !== 'undefined' && (window as any).React?.unstable_batchedUpdates) {
    (window as any).React.unstable_batchedUpdates(() => {
      updates.forEach(update => update());
    });
  } else {
    updates.forEach(update => update());
  }
}

/**
 * Memory-efficient cache with size limits
 * Prevents memory leaks on slower devices
 */
export class LRUCache<K, V> {
  private cache: Map<K, V>;
  private maxSize: number;

  constructor(maxSize: number = 50) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) return undefined;
    const value = this.cache.get(key)!;
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }
}

/**
 * Detect if device is slow (Windows laptop, low-end device)
 * Adjust performance settings accordingly
 */
export function isSlowDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check for Windows
  const isWindows = navigator.platform.toLowerCase().includes('win');
  
  // Check hardware concurrency (CPU cores)
  const cores = navigator.hardwareConcurrency || 4;
  
  // Check memory (if available)
  const memory = (navigator as any).deviceMemory || 4;
  
  // Consider it slow if Windows with low cores or low memory
  return isWindows && (cores < 4 || memory < 4);
}

/**
 * Get optimal debounce delay based on device performance
 */
export function getOptimalDebounceDelay(): number {
  return isSlowDevice() ? 500 : 300;
}

/**
 * Get optimal throttle delay based on device performance
 */
export function getOptimalThrottleDelay(): number {
  return isSlowDevice() ? 200 : 100;
}

/**
 * Disable expensive animations on slow devices
 */
export function shouldReduceAnimations(): boolean {
  return isSlowDevice();
}

/**
 * Initialize performance optimizations on page load
 */
export function initPerformanceOptimizations() {
  if (typeof window === 'undefined') return;

  // Optimize scroll performance
  optimizeScrollPerformance();

  // Lazy load images
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', lazyLoadImages);
  } else {
    lazyLoadImages();
  }

  // Reduce animations on slow devices
  if (shouldReduceAnimations()) {
    document.documentElement.style.setProperty('--animation-duration', '0.1s');
    document.documentElement.classList.add('reduce-motion');
  }
}

