// MS Angle Options based on IS 808 (2021)
// Common ISA (Indian Standard Angle) sizes used in sign board frames

export type MsAngleOption = {
  id: string;
  label: string;      // e.g., "ISA 25x25x3.0"
  designation: string; // e.g., "25x25x3"
  weightKgPerM: number; // from IS 808 table
};

export const MS_ANGLE_OPTIONS: MsAngleOption[] = [
  {
    id: 'angle-25x25x3',
    label: 'ISA 25x25x3 mm',
    designation: '25x25x3',
    weightKgPerM: 1.14,
  },
  {
    id: 'angle-35x35x3',
    label: 'ISA 35x35x3 mm',
    designation: '35x35x3',
    weightKgPerM: 1.62,
  },
  {
    id: 'rhs-40x20x2',
    label: 'RHS 40x20x2 mm',
    designation: '40x20x2',
    weightKgPerM: 1.76,
  },
];

// Helper to find angle by label or ID
export function findAngleOption(idOrLabel: string): MsAngleOption | undefined {
  return MS_ANGLE_OPTIONS.find(
    opt => opt.id === idOrLabel || opt.label === idOrLabel
  );
}

