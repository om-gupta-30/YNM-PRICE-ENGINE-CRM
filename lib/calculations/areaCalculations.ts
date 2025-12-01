// Area calculation utilities for Signages module

/**
 * Calculate area for different board shapes
 * All calculations return area in square millimeters (sq mm)
 */

export type Shape = 'Circular' | 'Rectangular' | 'Triangle' | 'Octagonal';

export interface AreaResult {
  areaSqMm: number;
  areaSqM: number;
  areaSqFt: number;
}

/**
 * Calculate area for Circular board
 * Note: We calculate area of the square from which the circle is cut
 * @param size - Size in mm (side of the square)
 */
export function calculateCircularArea(size: number): AreaResult {
  // Area of square = side × side (we cut circle from square)
  const areaSqMm = size * size;
  
  return {
    areaSqMm,
    areaSqM: areaSqMm / 1_000_000,
    areaSqFt: areaSqMm * 0.0000107639,
  };
}

/**
 * Calculate area for Triangular (equilateral) board
 * @param side - Side length in mm
 */
export function calculateTriangularArea(side: number): AreaResult {
  // Area of equilateral triangle = (√3 / 4) × side²
  const areaSqMm = (Math.sqrt(3) / 4) * side * side;
  
  return {
    areaSqMm,
    areaSqM: areaSqMm / 1_000_000,
    areaSqFt: areaSqMm * 0.0000107639,
  };
}

/**
 * Calculate area for Octagonal board
 * Note: We calculate area of the square from which the octagon is cut
 * @param size - Size in mm (side of the square)
 */
export function calculateOctagonalArea(size: number): AreaResult {
  // Area of square = side × side (we cut octagon from square)
  const areaSqMm = size * size;
  
  return {
    areaSqMm,
    areaSqM: areaSqMm / 1_000_000,
    areaSqFt: areaSqMm * 0.0000107639,
  };
}

/**
 * Calculate area for Rectangular board
 * @param width - Width in mm
 * @param height - Height in mm
 */
export function calculateRectangularArea(width: number, height: number): AreaResult {
  const areaSqMm = width * height;
  
  return {
    areaSqMm,
    areaSqM: areaSqMm / 1_000_000,
    areaSqFt: areaSqMm * 0.0000107639,
  };
}

/**
 * Calculate area based on shape and dimensions
 */
export function calculateArea(
  shape: Shape,
  size?: number,
  width?: number,
  height?: number
): AreaResult | null {
  switch (shape) {
    case 'Circular':
      if (size === undefined) return null;
      return calculateCircularArea(size);
    
    case 'Triangle':
      if (size === undefined) return null;
      return calculateTriangularArea(size);
    
    case 'Octagonal':
      if (size === undefined) return null;
      return calculateOctagonalArea(size);
    
    case 'Rectangular':
      if (width === undefined || height === undefined) return null;
      return calculateRectangularArea(width, height);
    
    default:
      return null;
  }
}

