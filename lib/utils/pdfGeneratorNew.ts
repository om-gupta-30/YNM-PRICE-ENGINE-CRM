// New Professional PDF Generator based on Template
// This file contains the new PDF generator matching the EXACT template structure

import jsPDF from 'jspdf';

export interface PDFItemData {
  itemName: string;
  description: string;
  dimensions?: string;
  hsnSacCode: string;
  quantity: number;
  rate: number;
  igst?: number;
  sgst?: number;
  cgst?: number;
  amount: number;
}

export interface PDFAddressData {
  customerName: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstin?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
}

export interface PDFQuotationDataNew {
  // Header info
  estimateNumber: string; // Format: YNM/EST-1, YNM/EST-2, etc.
  estimateDate: string; // DD/MM/YYYY format
  expiryDate: string; // DD/MM/YYYY format
  placeOfSupply: string;
  productType: string; // e.g., "Reflective Part", "W-Beam Section", etc.
  customerName: string;
  createdBy: string;
  
  // Addresses
  billTo?: PDFAddressData;
  shipTo?: PDFAddressData;
  
  // Items
  items: PDFItemData[];
  
  // Totals
  subtotal: number;
  totalTax: number;
  finalTotal: number;
  totalInWords: string;
  
  // Terms and Conditions
  termsAndConditions: string;
  
  // Bank details (static for now)
  bankDetails?: {
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    branch?: string;
  };
}

// Helper function to format number with commas
function formatNumber(num: number): string {
  if (isNaN(num)) return '0.00';
  const numStr = num.toFixed(2);
  const parts = numStr.split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1];
  
  let formattedInteger = '';
  for (let i = integerPart.length - 1, count = 0; i >= 0; i--, count++) {
    if (count > 0 && count % 3 === 0) {
      formattedInteger = ',' + formattedInteger;
    }
    formattedInteger = integerPart[i] + formattedInteger;
  }
  
  return `${formattedInteger}.${decimalPart}`;
}

// Helper function to check if place is Telangana
function isTelangana(place: string): boolean {
  const telanganaPlaces = ['Telangana', 'Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar'];
  return telanganaPlaces.some(p => place.toLowerCase().includes(p.toLowerCase()));
}

export async function generateNewProfessionalPDF(data: PDFQuotationDataNew, fileName: string): Promise<void> {
  const doc = new jsPDF();
  doc.setFont('helvetica');
  
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const marginLeft = 20;
  const marginRight = pageWidth - 20;
  const contentWidth = marginRight - marginLeft;
  
  let yPos = 25;
  
  // Helper: Check if new page needed
  const checkNewPage = (requiredSpace: number) => {
    if (yPos + requiredSpace > pageHeight - 40) {
      doc.addPage();
      yPos = 25;
      return true;
    }
    return false;
  };
  
  // Helper: Add spacing
  const addSpacing = (spacing: number = 5) => {
    yPos += spacing;
  };
  
  // ============================================
  // HEADER SECTION - EXACT TEMPLATE FORMAT
  // ============================================
  // Company Name - Centered
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('YNM SAFETY PVT LTD', pageWidth / 2, yPos, { align: 'center' });
  addSpacing(10);
  
  // Title - Centered
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Price Estimate & Material Breakdown', pageWidth / 2, yPos, { align: 'center' });
  addSpacing(15);
  
  // ============================================
  // DETAILS SECTION - Left-aligned (EXACT FORMAT)
  // ============================================
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  // Date
  doc.text(`Date: ${data.estimateDate}`, marginLeft, yPos);
  addSpacing(8);
  
  // Product Type
  doc.text(`Product Type: ${data.productType}`, marginLeft, yPos);
  addSpacing(8);
  
  // Customer Name
  doc.text(`Customer Name: ${data.customerName}`, marginLeft, yPos);
  addSpacing(8);
  
  // Place of Supply
  doc.text(`Place of Supply: ${data.placeOfSupply}`, marginLeft, yPos);
  addSpacing(8);
  
  // Created By
  doc.text(`Created By: ${data.createdBy}`, marginLeft, yPos);
  addSpacing(15);
  
  // ============================================
  // QUOTATION DETAILS SECTION
  // ============================================
  checkNewPage(50);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`${data.productType} Quotation Details`, marginLeft, yPos);
  addSpacing(10);
  
  // ============================================
  // ITEMS TABLE (if items exist)
  // ============================================
  if (data.items && data.items.length > 0) {
    checkNewPage(80);
    
    const tableStartY = yPos;
    const colWidths = {
      item: 60,
      hsnSac: 25,
      quantity: 20,
      rate: 25,
      igst: 20,
      sgst: 20,
      cgst: 20,
      amount: 30
    };
    
    const isTelanganaOrder = isTelangana(data.placeOfSupply);
    
    // Table Header
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    let xPos = marginLeft;
    
    doc.text('Item & Description', xPos, yPos);
    xPos += colWidths.item;
    
    doc.text('HSN/SAC', xPos, yPos);
    xPos += colWidths.hsnSac;
    
    doc.text('Qty', xPos, yPos);
    xPos += colWidths.quantity;
    
    doc.text('Rate', xPos, yPos);
    xPos += colWidths.rate;
    
    if (isTelanganaOrder) {
      doc.text('IGST', xPos, yPos);
      xPos += colWidths.igst;
    } else {
      doc.text('SGST', xPos, yPos);
      xPos += colWidths.sgst;
      doc.text('CGST', xPos, yPos);
      xPos += colWidths.cgst;
    }
    
    doc.text('Amount', xPos, yPos);
    
    // Draw header line
    addSpacing(3);
    doc.setLineWidth(0.5);
    doc.line(marginLeft, yPos, marginRight, yPos);
    addSpacing(3);
    
    // Table Rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    
    for (const item of data.items) {
      checkNewPage(15);
      
      xPos = marginLeft;
      const rowStartY = yPos;
      let maxRowHeight = 5;
      
      // Item & Description (with wrapping)
      const itemText = `${item.itemName}${item.description ? ` - ${item.description}` : ''}${item.dimensions ? ` (${item.dimensions})` : ''}`;
      const itemLines = doc.splitTextToSize(itemText, colWidths.item - 2);
      doc.text(itemLines, xPos, yPos);
      maxRowHeight = Math.max(maxRowHeight, itemLines.length * 4);
      xPos += colWidths.item;
      
      // HSN/SAC
      doc.text(item.hsnSacCode, xPos, rowStartY);
      xPos += colWidths.hsnSac;
      
      // Quantity
      doc.text(item.quantity.toString(), xPos, rowStartY);
      xPos += colWidths.quantity;
      
      // Rate
      doc.text(formatNumber(item.rate), xPos, rowStartY);
      xPos += colWidths.rate;
      
      // Tax columns
      if (isTelanganaOrder) {
        // IGST
        doc.text(item.igst ? `${item.igst}%` : '0%', xPos, rowStartY);
        xPos += colWidths.igst;
      } else {
        // SGST
        doc.text(item.sgst ? `${item.sgst}%` : '0%', xPos, rowStartY);
        xPos += colWidths.sgst;
        // CGST
        doc.text(item.cgst ? `${item.cgst}%` : '0%', xPos, rowStartY);
        xPos += colWidths.cgst;
      }
      
      // Amount
      doc.text(formatNumber(item.amount), xPos, rowStartY);
      
      yPos = rowStartY + maxRowHeight;
      addSpacing(2);
      
      // Draw row line
      doc.setLineWidth(0.1);
      doc.line(marginLeft, yPos, marginRight, yPos);
      addSpacing(2);
    }
    
    addSpacing(10);
    
    // ============================================
    // TOTALS SECTION
    // ============================================
    checkNewPage(40);
    
    const totalsX = marginRight - 80;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Subtotal:', totalsX, yPos);
    doc.text(formatNumber(data.subtotal), marginRight, yPos, { align: 'right' });
    addSpacing(5);
    
    if (data.totalTax > 0) {
      doc.text('Tax:', totalsX, yPos);
      doc.text(formatNumber(data.totalTax), marginRight, yPos, { align: 'right' });
      addSpacing(5);
    }
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Total:', totalsX, yPos);
    doc.text(formatNumber(data.finalTotal), marginRight, yPos, { align: 'right' });
    addSpacing(8);
    
    // Total in Words
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Total in Words:', marginLeft, yPos);
    addSpacing(4);
    doc.setFont('helvetica', 'normal');
    const wordsLines = doc.splitTextToSize(data.totalInWords, contentWidth - 10);
    doc.text(wordsLines, marginLeft + 5, yPos);
    yPos += wordsLines.length * 4;
    addSpacing(10);
  }
  
  // ============================================
  // AUTHORIZED SIGNATURE - Bottom Right (EXACT FORMAT)
  // ============================================
  checkNewPage(40);
  
  const signatureBoxWidth = 60;
  const signatureBoxHeight = 30;
  const signatureX = marginRight;
  const signatureBoxY = pageHeight - 50;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Authorized Signatory', signatureX, signatureBoxY - 5, { align: 'right' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('YNM Safety Pvt Ltd', signatureX, signatureBoxY + 5, { align: 'right' });
  doc.text('(Signature & Seal)', signatureX, signatureBoxY + 10, { align: 'right' });
  
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.rect(signatureX - signatureBoxWidth, signatureBoxY, signatureBoxWidth, signatureBoxHeight, 'S');
  
  // ============================================
  // FOOTER - Bottom Left (EXACT FORMAT)
  // ============================================
  const footerY = pageHeight - 15;
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text('© YNM Safety Pvt Ltd – This is a computer-generated estimate.', marginLeft, footerY);
  
  // Download PDF
  doc.save(fileName);
}
