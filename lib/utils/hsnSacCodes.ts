// HSN/SAC Code mapping for products
// This is a placeholder - can be enhanced with Google API integration later

export function getHSNCode(productName: string, productType?: string): string {
  // MBCB Products - HSN Code 7308 (Iron or steel structures)
  if (productType?.toLowerCase().includes('mbcb') || 
      productName.toLowerCase().includes('beam') ||
      productName.toLowerCase().includes('crash barrier') ||
      productName.toLowerCase().includes('post') ||
      productName.toLowerCase().includes('spacer')) {
    return '7308';
  }
  
  // Signages - HSN Code 9405 (Lamps and lighting fittings)
  if (productType?.toLowerCase().includes('signage') ||
      productName.toLowerCase().includes('sign') ||
      productName.toLowerCase().includes('board')) {
    return '9405';
  }
  
  // Paint - HSN Code 3208 (Paints and varnishes)
  if (productType?.toLowerCase().includes('paint') ||
      productName.toLowerCase().includes('paint') ||
      productName.toLowerCase().includes('coating')) {
    return '3208';
  }
  
  // Default HSN code for metal products
  return '7308';
}

// Get GST rate based on product (default 18%)
export function getGSTRate(productName: string, productType?: string): number {
  // Most products have 18% GST
  return 18;
}

