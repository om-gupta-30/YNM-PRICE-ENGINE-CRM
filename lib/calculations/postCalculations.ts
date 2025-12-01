/**
 * Calculate Post weights using formula-based approach
 * 
 * Constants:
 * - width = 150 mm
 * - height = 75 mm
 * - nominalWidth = 278 mm
 * - densityOfSteel = 0.0000079 kg per cubic mm
 */

// Hardcoded constants for Post
const POST_CONSTANTS = {
  width: 150, // mm
  height: 75, // mm
  nominalWidth: 278, // mm
  densityOfSteel: 0.0000079, // kg per cubic mm
} as const;

export interface PostWeightResult {
  blackMaterialWeightKg: number;
  zincWeightKg: number;
  totalPostWeightKg: number;
}

/**
 * Calculate Post weights based on thickness, length, and coating GSM
 * 
 * @param thicknessMm - Thickness in mm (user input)
 * @param lengthMm - Length in mm (user input: 1100, 1200, 1300, etc.)
 * @param coatingGsm - Coating GSM value (350, 400, 450, 500, or 550)
 * @returns Object containing black material weight, zinc weight, and total weight in kg
 */
export function calculatePostWeights({
  thicknessMm,
  lengthMm,
  coatingGsm,
}: {
  thicknessMm: number;
  lengthMm: number;
  coatingGsm: number;
}): PostWeightResult {
  const { nominalWidth, densityOfSteel } = POST_CONSTANTS;

  // Calculate black material weight
  // volumeMm3 = thicknessMm * nominalWidthMm * lengthMm
  const volumeMm3 = thicknessMm * nominalWidth * lengthMm;
  
  // blackMaterialWeightKg = volumeMm3 * densityOfSteel
  const blackMaterialWeightKg = volumeMm3 * densityOfSteel;

  // Calculate zinc weight
  // Surface area (mm²):
  // surfaceAreaMm2 = 2 * (thicknessMm * nominalWidthMm + nominalWidthMm * lengthMm + lengthMm * thicknessMm)
  const surfaceAreaMm2 =
    2 *
    (thicknessMm * nominalWidth +
      nominalWidth * lengthMm +
      lengthMm * thicknessMm);

  // Convert mm² → m²
  const surfaceAreaM2 = surfaceAreaMm2 / 1_000_000;

  // Compute zinc weight
  // zincWeightKg = (surfaceAreaM2 * coatingGsm) / 1000
  const zincWeightKg = (surfaceAreaM2 * coatingGsm) / 1000;

  // Total Post weight
  const totalPostWeightKg = blackMaterialWeightKg + zincWeightKg;

  return {
    blackMaterialWeightKg,
    zincWeightKg,
    totalPostWeightKg,
  };
}

