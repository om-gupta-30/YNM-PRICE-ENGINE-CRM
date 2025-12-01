/**
 * Performance utilities for low-power device detection and optimization
 */

/**
 * Detects if the device is low-power (weak CPU/GPU)
 * Useful for disabling heavy animations and effects on Windows laptops
 */
export function isLowPowerDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  
  const cpu = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as any).deviceMemory ?? 4;
  
  // Consider devices with <6 cores or <4GB RAM as low-power
  return cpu < 6 || memory < 4;
}

/**
 * Checks if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Should animations be disabled?
 * Returns true if device is low-power OR user prefers reduced motion
 */
export function shouldDisableAnimations(): boolean {
  return isLowPowerDevice() || prefersReducedMotion();
}

/**
 * Get optimized animation duration based on device capabilities
 */
export function getOptimizedDuration(defaultDuration: number): number {
  if (shouldDisableAnimations()) {
    return 0.01; // Near-instant for low-power devices
  }
  return Math.min(defaultDuration, 0.2); // Cap at 200ms for performance
}
