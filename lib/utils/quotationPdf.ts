import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper function to load logo as base64
export async function loadLogoAsBase64(): Promise<string | null> {
  try {
    const response = await fetch('/LOGO.png');
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.log('Could not load logo:', error);
    return null;
  }
}

// Company Information
const COMPANY_INFO = {
  name: 'YNM Pan Global Trade Private Limited',
  address: 'S-9, S.A.Trade Center, 2nd Floor, Ranigunj X Road,',
  city: 'Secunderabad',
  state: 'Hyderabad Telangana 500003',
  country: 'India',
  gstin: 'GSTIN 36AAACY6524A1ZM',
  phone: '8121550143',
  email: 'rishu@ynmsafety.com',
  website: 'www.ynmsafety.com',
};

const BANK_DETAILS = {
  accountName: 'YNM PAN GLOBAL TRADE PRIVATE LIMITED',
  bankName: 'ICICI BANK',
  accountNumber: '018351000050',
  ifscCode: 'ICIC0000183',
  branch: 'BEGUMPET',
};

// Convert number to words (Indian numbering system) - Fixed version
function numberToWordsForPDF(num: number): string {
  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];

  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ];

  function convertHundreds(n: number): string {
    let result = '';
    
    if (n >= 100) {
      result += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    
    if (n >= 20) {
      result += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    
    if (n > 0) {
      result += ones[n] + ' ';
    }
    
    return result.trim();
  }

  if (num === 0) return 'Zero Rupees Only';

  const integerPart = Math.floor(Math.abs(num));
  const decimalPart = Math.round((Math.abs(num) - integerPart) * 100);

  let result = '';

  // Crores (1,00,00,000)
  if (integerPart >= 10000000) {
    const crores = Math.floor(integerPart / 10000000);
    result += convertHundreds(crores) + ' Crore ';
  }

  // Lakhs (1,00,000)
  const afterCrore = integerPart % 10000000;
  if (afterCrore >= 100000) {
    const lakhs = Math.floor(afterCrore / 100000);
    result += convertHundreds(lakhs) + ' Lakh ';
  }

  // Thousands (1,000)
  const afterLakh = afterCrore % 100000;
  if (afterLakh >= 1000) {
    const thousands = Math.floor(afterLakh / 1000);
    result += convertHundreds(thousands) + ' Thousand ';
  }

  // Hundreds, Tens, Ones
  const remainder = afterLakh % 1000;
  if (remainder > 0) {
    result += convertHundreds(remainder);
  }

  result = result.trim();

  // Add "Rupees" and handle paise
  if (result) {
    result += ' Rupees';
  }

  if (decimalPart > 0) {
    result += ' and ' + convertHundreds(decimalPart) + ' Paise';
  }

  result += ' Only';

  return result.trim();
}

// Format currency without superscript issues
function formatCurrency(amount: number): string {
  return 'Rs. ' + amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Format currency in Indian style (with lakhs and crores)
function formatIndianCurrency(amount: number): string {
  const absAmount = Math.abs(amount);
  const [intPart, decPart] = absAmount.toFixed(2).split('.');
  
  // Indian number formatting
  let lastThree = intPart.slice(-3);
  let otherNumbers = intPart.slice(0, -3);
  
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
    otherNumbers = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  }
  
  const formatted = otherNumbers + lastThree + '.' + decPart;
  return 'Rs. ' + formatted;
}

interface BillToAddress {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstNumber?: string;
}

interface ShipToAddress {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

interface PDFItem {
  description: string;
  quantity: number;
  unit: string;
  hsnCode: string;
  rate: number;
  amount: number;
}

interface PDFData {
  estimateNumber: string;
  estimateDate: string;
  expiryDate: string;
  placeOfSupply: string;
  billTo: BillToAddress;
  shipTo: ShipToAddress;
  items: PDFItem[];
  subtotal: number;
  sgst?: number;
  cgst?: number;
  igst?: number;
  totalAmount: number;
  termsAndConditions: string;
}

export function generateQuotationPDF(data: PDFData, logoBase64?: string): jsPDF {
  const doc = new jsPDF();
  let yPos = 15;

  // Try to add logo
  try {
    if (logoBase64) {
      // Add the actual logo image
      doc.addImage(logoBase64, 'PNG', 15, 8, 25, 25);
    } else {
      // Logo placeholder - positioned at top left
      doc.setFillColor(41, 128, 185);
      doc.rect(15, 10, 25, 25, 'F');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text('YNM', 22, 24);
      doc.text('SAFETY', 19, 29);
      doc.setTextColor(0, 0, 0);
    }
  } catch (e) {
    console.log('Logo could not be added');
  }

  // Company Header - positioned to the right of logo
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(COMPANY_INFO.name, 105, yPos, { align: 'center' });
  yPos += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(COMPANY_INFO.address, 105, yPos, { align: 'center' });
  yPos += 4;
  doc.text(COMPANY_INFO.city, 105, yPos, { align: 'center' });
  yPos += 4;
  doc.text(COMPANY_INFO.state, 105, yPos, { align: 'center' });
  yPos += 4;
  doc.text(COMPANY_INFO.country, 105, yPos, { align: 'center' });
  yPos += 4;
  doc.text(COMPANY_INFO.gstin, 105, yPos, { align: 'center' });
  yPos += 4;
  doc.text(`${COMPANY_INFO.phone} | ${COMPANY_INFO.email}`, 105, yPos, { align: 'center' });
  yPos += 4;
  doc.text(COMPANY_INFO.website, 105, yPos, { align: 'center' });
  yPos += 8;

  // Line separator
  doc.setLineWidth(0.5);
  doc.line(15, yPos, 195, yPos);
  yPos += 8;

  // Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('QUOTATION', 105, yPos, { align: 'center' });
  yPos += 10;

  // Quotation Details - Two columns
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  // Left column - Estimate details
  doc.setFont('helvetica', 'bold');
  doc.text('Estimate #:', 15, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(data.estimateNumber, 45, yPos);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Place of Supply:', 110, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(data.placeOfSupply, 145, yPos);
  yPos += 5;
  
  doc.setFont('helvetica', 'bold');
  doc.text('Estimate Date:', 15, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(data.estimateDate, 45, yPos);
  yPos += 5;
  
  doc.setFont('helvetica', 'bold');
  doc.text('Expiry Date:', 15, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(data.expiryDate, 45, yPos);
  yPos += 10;

  // Bill To and Ship To - Side by side
  const billToX = 15;
  const shipToX = 110;
  const addressStartY = yPos;
  
  // Bill To
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Bill To:', billToX, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  
  if (data.billTo.name) {
    doc.text(data.billTo.name, billToX, yPos);
    yPos += 4;
  }
  if (data.billTo.address) {
    const billAddress = doc.splitTextToSize(data.billTo.address, 80);
    doc.text(billAddress, billToX, yPos);
    yPos += billAddress.length * 4;
  }
  if (data.billTo.city || data.billTo.state) {
    doc.text(`${data.billTo.city || ''}${data.billTo.city && data.billTo.state ? ', ' : ''}${data.billTo.state || ''}`, billToX, yPos);
    yPos += 4;
  }
  if (data.billTo.pincode) {
    doc.text(`PIN: ${data.billTo.pincode}`, billToX, yPos);
    yPos += 4;
  }
  if (data.billTo.gstNumber) {
    doc.text(`GSTIN: ${data.billTo.gstNumber}`, billToX, yPos);
    yPos += 4;
  }
  
  const billToEndY = yPos;
  
  // Ship To - Start from same Y position
  yPos = addressStartY;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Ship To:', shipToX, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  
  if (data.shipTo.name) {
    doc.text(data.shipTo.name, shipToX, yPos);
    yPos += 4;
  }
  if (data.shipTo.address) {
    const shipAddress = doc.splitTextToSize(data.shipTo.address, 80);
    doc.text(shipAddress, shipToX, yPos);
    yPos += shipAddress.length * 4;
  }
  if (data.shipTo.city || data.shipTo.state) {
    doc.text(`${data.shipTo.city || ''}${data.shipTo.city && data.shipTo.state ? ', ' : ''}${data.shipTo.state || ''}`, shipToX, yPos);
    yPos += 4;
  }
  if (data.shipTo.pincode) {
    doc.text(`PIN: ${data.shipTo.pincode}`, shipToX, yPos);
  }
  
  // Use the max of billTo and shipTo end positions
  yPos = Math.max(billToEndY, yPos) + 8;

  // Items Table
  const tableData = data.items.map((item) => [
    item.description,
    item.quantity.toString(),
    item.unit,
    item.hsnCode,
    formatIndianCurrency(item.rate),
    formatIndianCurrency(item.amount),
  ]);

  autoTable(doc, {
    head: [['Item/Description', 'Qty', 'Unit', 'HSN/SAC', 'Rate', 'Amount']],
    body: tableData,
    startY: yPos,
    theme: 'grid',
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center',
    },
    styles: {
      fontSize: 8,
      cellPadding: 3,
      overflow: 'linebreak',
    },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 15, halign: 'center' },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 35, halign: 'right' },
      5: { cellWidth: 35, halign: 'right' },
    },
  });

  // Get final Y position after table
  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Price Breakdown - Right aligned
  const priceX = 120;
  const valueX = 190;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  doc.text('Subtotal:', priceX, yPos);
  doc.text(formatIndianCurrency(data.subtotal), valueX, yPos, { align: 'right' });
  yPos += 5;

  // GST Breakdown - Show appropriate taxes based on place of supply
  if (data.sgst !== undefined && data.sgst > 0) {
    doc.text('SGST (9%):', priceX, yPos);
    doc.text(formatIndianCurrency(data.sgst), valueX, yPos, { align: 'right' });
    yPos += 5;
  }

  if (data.cgst !== undefined && data.cgst > 0) {
    doc.text('CGST (9%):', priceX, yPos);
    doc.text(formatIndianCurrency(data.cgst), valueX, yPos, { align: 'right' });
    yPos += 5;
  }

  if (data.igst !== undefined && data.igst > 0) {
    doc.text('IGST (18%):', priceX, yPos);
    doc.text(formatIndianCurrency(data.igst), valueX, yPos, { align: 'right' });
    yPos += 5;
  }

  // Total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Total:', priceX, yPos);
  doc.text(formatIndianCurrency(data.totalAmount), valueX, yPos, { align: 'right' });
  yPos += 8;

  // Amount in Words
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Amount in Words:', 15, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  const amountWords = numberToWordsForPDF(Math.round(data.totalAmount));
  const wordsLines = doc.splitTextToSize(amountWords, 180);
  doc.text(wordsLines, 15, yPos);
  yPos += wordsLines.length * 4 + 8;

  // Check if we need a new page for bank details and terms
  if (yPos > 220) {
    doc.addPage();
    yPos = 20;
  }

  // Bank Details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Notes', 15, yPos);
  yPos += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Bank Details:', 15, yPos);
  yPos += 4;
  doc.text(`Account Name: ${BANK_DETAILS.accountName}`, 15, yPos);
  yPos += 4;
  doc.text(`Bank Name: ${BANK_DETAILS.bankName}`, 15, yPos);
  yPos += 4;
  doc.text(`Account Number: ${BANK_DETAILS.accountNumber}`, 15, yPos);
  yPos += 4;
  doc.text(`IFSC Code: ${BANK_DETAILS.ifscCode}`, 15, yPos);
  yPos += 4;
  doc.text(`Branch: ${BANK_DETAILS.branch}`, 15, yPos);
  yPos += 10;

  // Terms and Conditions
  if (yPos > 240) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Terms and Conditions:', 15, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const termsLines = doc.splitTextToSize(data.termsAndConditions, 180);
  doc.text(termsLines, 15, yPos);
  yPos += termsLines.length * 4 + 15;

  // Authorized Signature
  if (yPos > 260) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('For YNM Pan Global Trade Pvt Ltd', 140, yPos);
  yPos += 20;
  doc.text('Authorized Signature', 140, yPos);
  doc.rect(135, yPos - 18, 55, 15); // Signature box
  
  return doc;
}

// Helper function to get HSN/SAC codes
export function getHSNCode(productType: string, section: string): string {
  const hsnCodes: Record<string, Record<string, string>> = {
    'MBCB': {
      'W-Beam': '7308',
      'Thrie-Beam': '7308',
      'Double W-Beam': '7308',
      'Post': '7308',
      'Spacer': '7308',
      'Fasteners': '7318',
      'Crash Barrier': '7308',
    },
    'Signages': {
      'Reflective': '8310',
      'Board': '8310',
    },
    'Services': {
      'Transportation': '9965',
      'Installation': '9954',
    }
  };

  return hsnCodes[section]?.[productType] || '9999';
}

// Calculate GST based on place of supply
// CORRECTED: Telangana (intra-state) = SGST + CGST, Other states (inter-state) = IGST
export function calculateGST(subtotal: number, placeOfSupply: string) {
  const isTelangana = placeOfSupply.toLowerCase().includes('telangana');

  if (isTelangana) {
    // For Telangana (intra-state), apply 9% SGST + 9% CGST
    const sgst = subtotal * 0.09;
    const cgst = subtotal * 0.09;
    return {
      sgst,
      cgst,
      igst: 0,
      total: subtotal + sgst + cgst,
    };
  } else {
    // For other states (inter-state), apply 18% IGST
    const igst = subtotal * 0.18;
    return {
      sgst: 0,
      cgst: 0,
      igst,
      total: subtotal + igst,
    };
  }
}
