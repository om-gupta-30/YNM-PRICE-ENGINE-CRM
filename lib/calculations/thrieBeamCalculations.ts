/**
 * Calculate Thrie Beam weights using formula-based approach
 * 
 * Constants:
 * - width = 80 mm
 * - height = 502 mm
 * - nominalWidth = 750 mm
 * - length = 4318 mm
 * - densityOfSteel = 0.0000079 kg per cubic mm
 */

// Hardcoded constants for Thrie Beam
const THRIE_BEAM_CONSTANTS = {
  width: 80, // mm (kept for reference, not used in current calculations)
  height: 502, // mm (kept for reference, not used in current calculations)
  nominalWidth: 750, // mm
  length: 4318, // mm
  densityOfSteel: 0.0000079, // kg per cubic mm
} as const;

export interface ThrieBeamWeightResult {
  blackMaterialWeightKg: number;
  zincWeightKg: number;
  totalThrieBeamWeightKg: number;
}

/**
 * Calculate Thrie Beam weights based on thickness and coating GSM
 * 
 * @param thicknessMm - Thickness in mm (user input)
 * @param coatingGsm - Coating GSM value (350, 400, 450, 500, or 550)
 * @returns Object containing black material weight, zinc weight, and total weight in kg
 */
export function calculateThrieBeamWeights({
  thicknessMm,
  coatingGsm,
}: {
  thicknessMm: number;
  coatingGsm: number;
}): ThrieBeamWeightResult {
  const { nominalWidth, length, densityOfSteel } = THRIE_BEAM_CONSTANTS;

  // Calculate black material weight
  // volumeMm3 = thicknessMm * nominalWidthMm * lengthMm
  const volumeMm3 = thicknessMm * nominalWidth * length;
  
  // blackMaterialWeightKg = volumeMm3 * densityOfSteel
  const blackMaterialWeightKg = volumeMm3 * densityOfSteel;

  // Calculate zinc weight
  // Surface area (mm²):
  // surfaceAreaMm2 = 2 * (thicknessMm * nominalWidthMm + nominalWidthMm * lengthMm + lengthMm * thicknessMm)
  const surfaceAreaMm2 =
    2 *
    (thicknessMm * nominalWidth +
      nominalWidth * length +
      length * thicknessMm);

  // Convert mm² → m²
  const surfaceAreaM2 = surfaceAreaMm2 / 1_000_000;

  // Compute zinc weight
  // zincWeightKg = (surfaceAreaM2 * coatingGsm) / 1000
  const zincWeightKg = (surfaceAreaM2 * coatingGsm) / 1000;

  // Total Thrie Beam weight
  const totalThrieBeamWeightKg = blackMaterialWeightKg + zincWeightKg;

  return {
    blackMaterialWeightKg,
    zincWeightKg,
    totalThrieBeamWeightKg,
  };
}

