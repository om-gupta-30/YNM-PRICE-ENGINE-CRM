import mbcbJson from '../../data/mbcb.json';

export interface MbcbRow {
  materialCode: string;
  section: string;
  materialDescription: string;
  thickness: number;
  length?: number | null;
  coatingGsm: number;
  weightBlackMaterial: number;
  weightZincAdded: number;
}

// Export the JSON data as typed array
export const mbcbData: MbcbRow[] = mbcbJson as MbcbRow[];

/**
 * Finds a matching MBCB row based on the provided parameters
 * Normalizes material descriptions to match: "W-Beam", "Thrie Beam", "Post", "Spacer"
 */
export function findMbcbRow(
  materialDescription: 'W-Beam' | 'Thrie Beam' | 'Post' | 'Spacer',
  thickness: number,
  coatingGsm: number,
  length?: number | null,
  section?: string
): MbcbRow | undefined {
  return mbcbData.find(row => {
    // Normalize material description for matching
    let normalizedDesc = row.materialDescription;
    if (normalizedDesc.includes('W-Beam') && !normalizedDesc.includes('Thrie')) {
      normalizedDesc = 'W-Beam';
    } else if (normalizedDesc.includes('Thrie') || normalizedDesc.includes('Thrie-Beam') || normalizedDesc.includes('Thrie Beam')) {
      normalizedDesc = 'Thrie Beam';
    } else if (normalizedDesc.includes('Post')) {
      normalizedDesc = 'Post';
    } else if (normalizedDesc.includes('Spacer')) {
      normalizedDesc = 'Spacer';
    }

    const materialMatch = normalizedDesc === materialDescription;
    const thicknessMatch = row.thickness === thickness;
    const coatingMatch = row.coatingGsm === coatingGsm;
    
    // Section matching: if provided, must match
    let sectionMatch = true;
    if (section) {
      sectionMatch = row.section === section;
    }
    
    // Length matching: if provided, must match; if not provided, ignore
    let lengthMatch = true;
    if (length != null && length !== undefined) {
      lengthMatch = row.length === length;
    }
    
    return materialMatch && thicknessMatch && coatingMatch && lengthMatch && sectionMatch;
  });
}

/**
 * Get distinct values for a specific field and material
 */
export function getDistinctValues(
  materialDescription: 'W-Beam' | 'Thrie Beam' | 'Post' | 'Spacer',
  field: 'thickness' | 'length' | 'coatingGsm',
  section?: string
): (number | null)[] {
  const filtered = mbcbData.filter(row => {
    // Normalize material description
    let normalizedDesc = row.materialDescription;
    if (normalizedDesc.includes('W-Beam') && !normalizedDesc.includes('Thrie')) {
      normalizedDesc = 'W-Beam';
    } else if (normalizedDesc.includes('Thrie') || normalizedDesc.includes('Thrie-Beam') || normalizedDesc.includes('Thrie Beam')) {
      normalizedDesc = 'Thrie Beam';
    } else if (normalizedDesc.includes('Post')) {
      normalizedDesc = 'Post';
    } else if (normalizedDesc.includes('Spacer')) {
      normalizedDesc = 'Spacer';
    }

    const materialMatch = normalizedDesc === materialDescription;
    const sectionMatch = section ? row.section === section : true;
    return materialMatch && sectionMatch;
  });
  
  const values = new Set<(number | null)>();
  filtered.forEach(row => {
    const value = field === 'thickness' ? row.thickness :
                  field === 'length' ? row.length :
                  row.coatingGsm;
    if (value !== null && value !== undefined) {
      values.add(value);
    }
  });
  
  return Array.from(values).sort((a, b) => {
    if (a === null) return 1;
    if (b === null) return -1;
    return a - b;
  });
}

/**
 * Get all MBCB data (for debugging/admin purposes)
 */
export function getAllMbcbData(): MbcbRow[] {
  return mbcbData;
}
