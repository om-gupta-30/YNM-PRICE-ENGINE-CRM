// MS Pipe Options based on IS 1161 (1998)
// Common sizes used in sign board structures

export type MsPipeOption = {
  id: string;
  label: string;      // e.g., "OD 76.1mm x 4.0mm (Medium)"
  outerDiameterMm: number;
  thicknessMm: number;
  category: 'Light' | 'Medium' | 'Heavy';
  weightKgPerM: number; // from IS 1161 table
};

export const MS_PIPE_OPTIONS: MsPipeOption[] = [
  {
    id: 'pipe-76.1x3.2',
    label: 'OD 76.1mm x 3.2mm thickness (light)',
    outerDiameterMm: 76.1,
    thicknessMm: 3.2,
    category: 'Light',
    weightKgPerM: 5.71,
  },
  {
    id: 'pipe-88.9x3.2',
    label: 'OD 88.9mm x 3.2mm thickness (light)',
    outerDiameterMm: 88.9,
    thicknessMm: 3.2,
    category: 'Light',
    weightKgPerM: 6.72,
  },
];

// Helper to find pipe by label or ID
export function findPipeOption(idOrLabel: string): MsPipeOption | undefined {
  return MS_PIPE_OPTIONS.find(
    opt => opt.id === idOrLabel || opt.label === idOrLabel
  );
}

