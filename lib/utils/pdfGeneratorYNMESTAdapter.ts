// Adapter to convert from existing PDFQuotationDataNew to YNMESTPDFData
// This allows seamless integration with existing code

import { PDFQuotationDataNew, PDFItemData, PDFAddressData } from './pdfGeneratorNew';
import { YNMESTPDFData } from './pdfGeneratorYNMEST';
import { numberToWords } from './numberToWords';

// Helper: Check if Telangana (for IGST vs SGST/CGST)
function isTelangana(place: string): boolean {
  const telanganaKeywords = ['telangana', 'hyderabad', 'warangal', 'nizamabad', 'karimnagar'];
  return telanganaKeywords.some(keyword => 
    place.toLowerCase().includes(keyword.toLowerCase())
  );
}

export function convertToYNMESTPDFData(data: PDFQuotationDataNew): YNMESTPDFData {
  const isTelanganaOrder = isTelangana(data.placeOfSupply);
  
  // Convert items
  const items = data.items.map((item: PDFItemData) => {
    const baseItem = {
      itemName: item.itemName,
      description: item.description || '',
      hsnSacCode: item.hsnSacCode,
      quantity: item.quantity,
      rate: item.rate,
      amount: item.amount,
    };
    
    if (isTelanganaOrder) {
      return {
        ...baseItem,
        igst: item.igst || 0,
      };
    } else {
      return {
        ...baseItem,
        sgst: item.sgst || 0,
        cgst: item.cgst || 0,
      };
    }
  });
  
  // Calculate tax amounts
  let igstAmount: number | undefined;
  let sgstAmount: number | undefined;
  let cgstAmount: number | undefined;
  
  if (isTelanganaOrder) {
    igstAmount = data.totalTax;
  } else {
    sgstAmount = data.totalTax / 2;
    cgstAmount = data.totalTax / 2;
  }
  
  // Convert addresses
  const billTo = data.billTo ? {
    name: data.billTo.customerName || '',
    address: data.billTo.addressLine1 || '',
    city: data.billTo.city || '',
    state: data.billTo.state || '',
    pincode: data.billTo.pincode || '',
    gstin: data.billTo.gstin || '',
    contact: data.billTo.phone || '',
  } : undefined;
  
  const shipTo = data.shipTo ? {
    name: data.shipTo.customerName || '',
    address: data.shipTo.addressLine1 || '',
    city: data.shipTo.city || '',
    state: data.shipTo.state || '',
    pincode: data.shipTo.pincode || '',
    gstin: data.shipTo.gstin || '',
    contact: data.shipTo.phone || '',
  } : undefined;
  
  return {
    estimateNumber: data.estimateNumber,
    estimateDate: data.estimateDate,
    expiryDate: data.expiryDate,
    placeOfSupply: data.placeOfSupply,
    billTo,
    shipTo,
    items,
    subtotal: data.subtotal,
    igstAmount,
    sgstAmount,
    cgstAmount,
    grandTotal: data.finalTotal,
    totalInWords: data.totalInWords || numberToWords(data.finalTotal),
    termsAndConditions: data.termsAndConditions,
    bankDetails: data.bankDetails,
  };
}

