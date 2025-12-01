// PDF Generator - Pixel-Perfect Template Match
// Uses YNMEST-25436.pdf as background image with absolute-positioned dynamic text
// This ensures EXACT visual match to the uploaded template

'use client';

// Import existing types for compatibility
import { PDFQuotationDataNew, PDFItemData, PDFAddressData } from './pdfGeneratorNew';
import { loadTemplateBase64 } from '@/app/utils/pdfBase64Loader';

// Dynamic imports for client-side only
let pdfMake: any;
let pdfFonts: any;

// Initialize pdfMake with fonts (client-side only)
function initializePdfMake() {
  if (typeof window === 'undefined') {
    throw new Error('PDF generation is only available in the browser');
  }
  
  if (!pdfMake) {
    try {
      pdfMake = require('pdfmake/build/pdfmake');
      pdfFonts = require('pdfmake/build/vfs_fonts');
      if (pdfMake && pdfFonts && pdfFonts.pdfMake) {
        pdfMake.vfs = pdfFonts.pdfMake.vfs;
      }
    } catch (error) {
      console.error('Error loading pdfmake:', error);
      throw new Error('Failed to load PDF library');
    }
  }
  
  return pdfMake;
}

export interface YNMTemplatePDFData {
  // Header Info
  estimateNumber: string; // Format: YNM/EST-1, YNM/EST-2, etc.
  estimateDate: string; // DD/MM/YYYY format
  expiryDate: string; // DD/MM/YYYY format
  placeOfSupply: string;
  
  // Bill To Address
  billTo?: {
    name?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    gstin?: string;
    contact?: string;
  };
  
  // Ship To Address
  shipTo?: {
    name?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    gstin?: string;
    contact?: string;
  };
  
  // Items
  items: Array<{
    itemName: string;
    description?: string;
    hsnSacCode: string;
    quantity: number;
    rate: number;
    igst?: number; // Percentage
    sgst?: number; // Percentage
    cgst?: number; // Percentage
    amount: number; // Total amount including tax
  }>;
  
  // Totals
  subtotal: number;
  igstAmount?: number;
  sgstAmount?: number;
  cgstAmount?: number;
  grandTotal: number;
  totalInWords: string;
  
  // Terms & Conditions
  termsAndConditions?: string;
  
  // Bank Details
  bankDetails?: {
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    branch?: string;
  };
}

// Helper: Format currency with commas (Indian format)
function formatCurrency(amount: number): string {
  return amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Helper: Check if Telangana (for IGST vs SGST/CGST)
function isTelangana(place: string): boolean {
  const telanganaKeywords = ['telangana', 'hyderabad', 'warangal', 'nizamabad', 'karimnagar'];
  return telanganaKeywords.some(keyword => 
    place.toLowerCase().includes(keyword.toLowerCase())
  );
}

// COORDINATE MAPPINGS - These need to be measured from the actual template PDF
// These are approximate coordinates - adjust based on actual template measurements
const COORDINATES = {
  // PAGE 1 - Top Info Box
  estimateNumber: { x: 30, y: 80 },
  estimateDate: { x: 150, y: 80 },
  expiryDate: { x: 270, y: 80 },
  placeOfSupply: { x: 390, y: 80 },
  
  // PAGE 1 - Bill To (approximate, adjust based on template)
  billToName: { x: 30, y: 120 },
  billToAddress: { x: 30, y: 135 },
  billToCity: { x: 30, y: 150 },
  billToGSTIN: { x: 30, y: 165 },
  
  // PAGE 1 - Ship To (approximate, adjust based on template)
  shipToName: { x: 300, y: 120 },
  shipToAddress: { x: 300, y: 135 },
  shipToCity: { x: 300, y: 150 },
  shipToGSTIN: { x: 300, y: 165 },
  
  // PAGE 1 - Table (approximate, adjust based on template)
  tableStartY: 200,
  tableRowHeight: 20,
  tableColumns: {
    item: { x: 30, width: 200 },
    hsn: { x: 230, width: 50 },
    qty: { x: 280, width: 40 },
    rate: { x: 320, width: 50 },
    igst: { x: 370, width: 40 },
    amount: { x: 410, width: 60 },
    total: { x: 470, width: 60 },
  },
  
  // PAGE 2 - Totals (approximate, adjust based on template)
  subtotal: { x: 470, y: 100 },
  igstAmount: { x: 470, y: 115 },
  sgstAmount: { x: 470, y: 115 },
  cgstAmount: { x: 470, y: 130 },
  grandTotal: { x: 470, y: 150 },
  totalInWords: { x: 30, y: 170 },
  
  // PAGE 2 - Bank Details
  bankDetails: { x: 30, y: 250 },
  
  // PAGE 2 - Terms & Conditions
  termsConditions: { x: 300, y: 250 },
  
  // PAGE 2 - Signature
  signature: { x: 470, y: 400 },
};

export async function generateYNMTemplatePDF(data: YNMTemplatePDFData): Promise<void> {
  const isTelanganaOrder = isTelangana(data.placeOfSupply);
  const pdfMakeInstance = initializePdfMake();
  
  // Load template images as base64 for both pages
  const page1Base64 = await loadTemplateBase64(1);
  const page2Base64 = await loadTemplateBase64(2);
  
  // PAGE 1 Content - Dynamic fields overlay on background
  const page1Content: any[] = [
    // Dynamic fields - Estimate Info Box
    {
      text: data.estimateNumber,
      absolutePosition: COORDINATES.estimateNumber,
      fontSize: 9,
      font: 'Helvetica',
    },
    {
      text: data.estimateDate,
      absolutePosition: COORDINATES.estimateDate,
      fontSize: 9,
      font: 'Helvetica',
    },
    {
      text: data.expiryDate,
      absolutePosition: COORDINATES.expiryDate,
      fontSize: 9,
      font: 'Helvetica',
    },
    {
      text: data.placeOfSupply,
      absolutePosition: COORDINATES.placeOfSupply,
      fontSize: 9,
      font: 'Helvetica',
    },
    
    // Bill To fields
    ...(data.billTo ? [
      {
        text: data.billTo.name || '',
        absolutePosition: COORDINATES.billToName,
        fontSize: 9,
        font: 'Helvetica',
      },
      {
        text: data.billTo.address || '',
        absolutePosition: COORDINATES.billToAddress,
        fontSize: 9,
        font: 'Helvetica',
      },
      {
        text: [
          data.billTo.city || '',
          data.billTo.state ? `, ${data.billTo.state}` : '',
          data.billTo.pincode ? ` - ${data.billTo.pincode}` : '',
        ].join(''),
        absolutePosition: COORDINATES.billToCity,
        fontSize: 9,
        font: 'Helvetica',
      },
      {
        text: [
          { text: 'GSTIN: ', bold: true },
          data.billTo.gstin || '',
        ],
        absolutePosition: COORDINATES.billToGSTIN,
        fontSize: 9,
        font: 'Helvetica',
      },
    ] : []),
    
    // Ship To fields
    ...(data.shipTo ? [
      {
        text: data.shipTo.name || '',
        absolutePosition: COORDINATES.shipToName,
        fontSize: 9,
        font: 'Helvetica',
      },
      {
        text: data.shipTo.address || '',
        absolutePosition: COORDINATES.shipToAddress,
        fontSize: 9,
        font: 'Helvetica',
      },
      {
        text: [
          data.shipTo.city || '',
          data.shipTo.state ? `, ${data.shipTo.state}` : '',
          data.shipTo.pincode ? ` - ${data.shipTo.pincode}` : '',
        ].join(''),
        absolutePosition: COORDINATES.shipToCity,
        fontSize: 9,
        font: 'Helvetica',
      },
      {
        text: [
          { text: 'GSTIN: ', bold: true },
          data.shipTo.gstin || '',
        ],
        absolutePosition: COORDINATES.shipToGSTIN,
        fontSize: 9,
        font: 'Helvetica',
      },
    ] : []),
    
    // Items table rows
    ...data.items.map((item, index) => {
      const rowY = COORDINATES.tableStartY + (index * COORDINATES.tableRowHeight);
      const itemDescription = [
        item.itemName,
        item.description ? ` - ${item.description}` : '',
      ].join('');
      
      return [
        // Item & Description
        {
          text: itemDescription,
          absolutePosition: {
            x: COORDINATES.tableColumns.item.x,
            y: rowY,
          },
          fontSize: 8,
          font: 'Helvetica',
          width: COORDINATES.tableColumns.item.width,
        },
        // HSN/SAC
        {
          text: item.hsnSacCode,
          absolutePosition: {
            x: COORDINATES.tableColumns.hsn.x,
            y: rowY,
          },
          fontSize: 8,
          font: 'Helvetica',
          alignment: 'center',
        },
        // Quantity
        {
          text: item.quantity.toString(),
          absolutePosition: {
            x: COORDINATES.tableColumns.qty.x,
            y: rowY,
          },
          fontSize: 8,
          font: 'Helvetica',
          alignment: 'center',
        },
        // Rate
        {
          text: formatCurrency(item.rate),
          absolutePosition: {
            x: COORDINATES.tableColumns.rate.x,
            y: rowY,
          },
          fontSize: 8,
          font: 'Helvetica',
          alignment: 'right',
        },
        // Tax (IGST or SGST/CGST)
        ...(isTelanganaOrder
          ? [
              {
                text: item.igst ? `${item.igst}%` : '0%',
                absolutePosition: {
                  x: COORDINATES.tableColumns.igst.x,
                  y: rowY,
                },
                fontSize: 8,
                font: 'Helvetica',
                alignment: 'center',
              },
            ]
          : [
              {
                text: item.sgst ? `${item.sgst}%` : '0%',
                absolutePosition: {
                  x: COORDINATES.tableColumns.igst.x,
                  y: rowY,
                },
                fontSize: 8,
                font: 'Helvetica',
                alignment: 'center',
              },
              {
                text: item.cgst ? `${item.cgst}%` : '0%',
                absolutePosition: {
                  x: COORDINATES.tableColumns.igst.x + 40,
                  y: rowY,
                },
                fontSize: 8,
                font: 'Helvetica',
                alignment: 'center',
              },
            ]),
        // Amount
        {
          text: formatCurrency(item.rate * item.quantity),
          absolutePosition: {
            x: COORDINATES.tableColumns.amount.x,
            y: rowY,
          },
          fontSize: 8,
          font: 'Helvetica',
          alignment: 'right',
        },
        // Total
        {
          text: formatCurrency(item.amount),
          absolutePosition: {
            x: COORDINATES.tableColumns.total.x,
            y: rowY,
          },
          fontSize: 8,
          font: 'Helvetica',
          alignment: 'right',
        },
      ];
    }).flat(),
  ];
  
  // PAGE 2 Content - Dynamic fields overlay on background
  const page2Content: any[] = [
    // Totals
    {
      text: formatCurrency(data.subtotal),
      absolutePosition: COORDINATES.subtotal,
      fontSize: 9,
      font: 'Helvetica',
      alignment: 'right',
    },
    ...(isTelanganaOrder && data.igstAmount
      ? [
          {
            text: formatCurrency(data.igstAmount),
            absolutePosition: COORDINATES.igstAmount,
            fontSize: 9,
            font: 'Helvetica',
            alignment: 'right',
          },
        ]
      : [
          ...(data.sgstAmount
            ? [
                {
                  text: formatCurrency(data.sgstAmount),
                  absolutePosition: COORDINATES.sgstAmount,
                  fontSize: 9,
                  font: 'Helvetica',
                  alignment: 'right',
                },
              ]
            : []),
          ...(data.cgstAmount
            ? [
                {
                  text: formatCurrency(data.cgstAmount),
                  absolutePosition: COORDINATES.cgstAmount,
                  fontSize: 9,
                  font: 'Helvetica',
                  alignment: 'right',
                },
              ]
            : []),
        ]),
    {
      text: formatCurrency(data.grandTotal),
      absolutePosition: COORDINATES.grandTotal,
      fontSize: 10,
      font: 'Helvetica',
      bold: true,
      alignment: 'right',
    },
    
    // Total in Words
    {
      text: data.totalInWords,
      absolutePosition: COORDINATES.totalInWords,
      fontSize: 9,
      font: 'Helvetica',
      width: 500,
    },
    
    // Bank Details
    ...(data.bankDetails
      ? [
          {
            text: [
              data.bankDetails.bankName || '',
              '\n',
              { text: 'A/C No: ', bold: true },
              data.bankDetails.accountNumber || '',
              '\n',
              { text: 'IFSC: ', bold: true },
              data.bankDetails.ifscCode || '',
              '\n',
              { text: 'Branch: ', bold: true },
              data.bankDetails.branch || '',
            ],
            absolutePosition: COORDINATES.bankDetails,
            fontSize: 8,
            font: 'Helvetica',
            width: 250,
            lineHeight: 1.4,
          },
        ]
      : []),
    
    // Terms & Conditions
    {
      text: data.termsAndConditions || 'Terms and conditions apply.',
      absolutePosition: COORDINATES.termsConditions,
      fontSize: 8,
      font: 'Helvetica',
      width: 250,
      lineHeight: 1.4,
    },
  ];
  
  // Document definition
  const docDefinition: any = {
    pageSize: 'A4',
    pageMargins: [0, 0, 0, 0], // IMPORTANT: No margins for pixel-perfect overlay
    defaultStyle: {
      font: 'Helvetica',
      fontSize: 9,
    },
    background: [
      {
        image: page1Base64,
        width: 595,
        height: 842,
        absolutePosition: { x: 0, y: 0 }
      },
      {
        image: page2Base64,
        width: 595,
        height: 842,
        absolutePosition: { x: 0, y: 0 }
      }
    ],
    content: [
      // Page 1
      ...page1Content,
      
      // Page break
      {
        text: '',
        pageBreak: 'before',
      },
      
      // Page 2
      ...page2Content,
    ],
  };
  
  // Generate and download PDF
  pdfMakeInstance.createPdf(docDefinition).download(
    `YNM-EST-${data.estimateNumber.replace('/', '-')}.pdf`
  );
}

// Wrapper function for compatibility with existing code
export async function generateYNMTemplatePDFFromQuotationData(
  data: PDFQuotationDataNew
): Promise<void> {
  // Ensure we're in browser
  if (typeof window === 'undefined') {
    throw new Error('PDF generation is only available in the browser');
  }
  
  const { convertToYNMTemplatePDFData } = await import('./pdfGeneratorYNMTemplateAdapter');
  const templateData = convertToYNMTemplatePDFData(data);
  await generateYNMTemplatePDF(templateData);
}

