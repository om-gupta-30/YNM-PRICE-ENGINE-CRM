// PDF Generator - Exact Template Replication
// This generator creates PDFs matching the YNMEST template exactly
// NOTE: This file must only be used on the client-side

// Import existing types for compatibility
import { PDFQuotationDataNew, PDFItemData, PDFAddressData } from './pdfGeneratorNew';

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
      // Use dynamic import for client-side only
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

export interface EstimatePDFData {
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
    igst?: number; // Percentage (e.g., 18 for 18%)
    sgst?: number; // Percentage
    cgst?: number; // Percentage
    amount: number; // Total amount including tax
  }>;
  
  // Totals
  subtotal: number;
  igstAmount?: number; // Only if IGST applies
  sgstAmount?: number; // Only if SGST applies
  cgstAmount?: number; // Only if CGST applies
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

// Helper: Format currency with commas
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

// Helper: Wrap text to fit column width
function wrapText(text: string, maxWidth: number, fontSize: number = 9): string[] {
  const charsPerLine = Math.floor((maxWidth / fontSize) * 2.5); // Approximate
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
    if ((currentLine + word).length <= charsPerLine) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  
  return lines;
}

export function generateEstimatePDF(data: EstimatePDFData): void {
  const isTelanganaOrder = isTelangana(data.placeOfSupply);
  
  // Define document structure
  const docDefinition: any = {
    pageSize: 'A4',
    pageMargins: [20, 20, 20, 20],
    defaultStyle: {
      font: 'Helvetica',
      fontSize: 9,
    },
    styles: {
      header: {
        fontSize: 16,
        bold: true,
        alignment: 'center',
        margin: [0, 0, 0, 10],
      },
      subheader: {
        fontSize: 12,
        bold: true,
        margin: [0, 5, 0, 5],
      },
      label: {
        fontSize: 9,
        bold: true,
      },
      value: {
        fontSize: 9,
      },
      tableHeader: {
        fontSize: 9,
        bold: true,
        fillColor: '#f0f0f0',
        alignment: 'center',
      },
      tableCell: {
        fontSize: 8,
      },
      tableCellRight: {
        fontSize: 8,
        alignment: 'right',
      },
      footer: {
        fontSize: 7,
        color: '#666666',
        italics: true,
      },
    },
    content: [
      // ============================================
      // HEADER SECTION - EXACT TEMPLATE FORMAT
      // ============================================
      {
        columns: [
          // Left: Company Info
          {
            width: '*',
            stack: [
              {
                text: 'YNM SAFETY PVT LTD',
                style: 'header',
                fontSize: 18,
                bold: true,
              },
              {
                text: [
                  { text: 'Address: ', bold: true },
                  'Plot No. 123, Industrial Area,\n',
                  'Hyderabad - 500001, Telangana, India\n',
                  { text: 'GSTIN: ', bold: true },
                  '36AABCY1234M1Z5\n',
                  { text: 'Phone: ', bold: true },
                  '+91-40-12345678 | ',
                  { text: 'Email: ', bold: true },
                  'info@ynmsafety.com',
                ],
                fontSize: 9,
                lineHeight: 1.4,
                margin: [0, 5, 0, 0],
              },
            ],
          },
          // Right: ESTIMATE Title
          {
            width: 'auto',
            stack: [
              {
                text: 'ESTIMATE',
                style: 'header',
                fontSize: 20,
                bold: true,
                alignment: 'right',
                margin: [0, 0, 0, 0],
              },
            ],
          },
        ],
        margin: [0, 0, 0, 15],
      },
      
      // ============================================
      // ESTIMATE INFO BOX - EXACT TEMPLATE FORMAT
      // ============================================
      {
        table: {
          widths: ['*', '*', '*', '*'],
          body: [
            [
              {
                text: [
                  { text: 'Estimate #: ', bold: true },
                  data.estimateNumber,
                ],
                border: [true, true, false, true],
                margin: [5, 5],
              },
              {
                text: [
                  { text: 'Estimate Date: ', bold: true },
                  data.estimateDate,
                ],
                border: [false, true, false, true],
                margin: [5, 5],
              },
              {
                text: [
                  { text: 'Expiry Date: ', bold: true },
                  data.expiryDate,
                ],
                border: [false, true, false, true],
                margin: [5, 5],
              },
              {
                text: [
                  { text: 'Place of Supply: ', bold: true },
                  data.placeOfSupply,
                ],
                border: [false, true, true, true],
                margin: [5, 5],
              },
            ],
          ],
        },
        layout: {
          hLineWidth: (i: number, node: any) => 0.5,
          vLineWidth: (i: number, node: any) => 0.5,
          hLineColor: () => '#000000',
          vLineColor: () => '#000000',
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0,
        },
        margin: [0, 0, 0, 15],
      },
      
      // ============================================
      // BILL TO & SHIP TO SECTION - EXACT TEMPLATE
      // ============================================
      {
        columns: [
          // Bill To
          {
            width: '*',
            stack: [
              {
                text: 'Bill To:',
                style: 'subheader',
                fontSize: 10,
                bold: true,
                margin: [0, 0, 0, 5],
              },
              {
                table: {
                  widths: ['*'],
                  body: [
                    [
                      {
                        text: data.billTo?.name || '',
                        border: [true, true, true, true],
                        margin: [5, 5],
                      },
                    ],
                    [
                      {
                        text: data.billTo?.address || '',
                        border: [true, false, true, false],
                        margin: [5, 5],
                      },
                    ],
                    [
                      {
                        text: [
                          (data.billTo?.city || ''),
                          data.billTo?.state ? `, ${data.billTo.state}` : '',
                          data.billTo?.pincode ? ` - ${data.billTo.pincode}` : '',
                        ],
                        border: [true, false, true, false],
                        margin: [5, 5],
                      },
                    ],
                    [
                      {
                        text: [
                          { text: 'GSTIN: ', bold: true },
                          data.billTo?.gstin || '',
                        ],
                        border: [true, false, true, true],
                        margin: [5, 5],
                      },
                    ],
                  ],
                },
                layout: {
                  hLineWidth: () => 0.5,
                  vLineWidth: () => 0.5,
                  hLineColor: () => '#000000',
                  vLineColor: () => '#000000',
                },
              },
            ],
          },
          // Ship To
          {
            width: '*',
            stack: [
              {
                text: 'Ship To:',
                style: 'subheader',
                fontSize: 10,
                bold: true,
                margin: [0, 0, 0, 5],
              },
              {
                table: {
                  widths: ['*'],
                  body: [
                    [
                      {
                        text: data.shipTo?.name || '',
                        border: [true, true, true, true],
                        margin: [5, 5],
                      },
                    ],
                    [
                      {
                        text: data.shipTo?.address || '',
                        border: [true, false, true, false],
                        margin: [5, 5],
                      },
                    ],
                    [
                      {
                        text: [
                          (data.shipTo?.city || ''),
                          data.shipTo?.state ? `, ${data.shipTo.state}` : '',
                          data.shipTo?.pincode ? ` - ${data.shipTo.pincode}` : '',
                        ],
                        border: [true, false, true, false],
                        margin: [5, 5],
                      },
                    ],
                    [
                      {
                        text: [
                          { text: 'GSTIN: ', bold: true },
                          data.shipTo?.gstin || '',
                        ],
                        border: [true, false, true, true],
                        margin: [5, 5],
                      },
                    ],
                  ],
                },
                layout: {
                  hLineWidth: () => 0.5,
                  vLineWidth: () => 0.5,
                  hLineColor: () => '#000000',
                  vLineColor: () => '#000000',
                },
              },
            ],
            margin: [10, 0, 0, 0],
          },
        ],
        margin: [0, 0, 0, 15],
      },
      
      // ============================================
      // ITEMS TABLE - EXACT TEMPLATE FORMAT
      // ============================================
      {
        table: {
          headerRows: 1,
          widths: isTelanganaOrder 
            ? ['*', 50, 40, 50, 40, 60, 60] // Item, HSN/SAC, Qty, Rate, IGST%, Amount, Total
            : ['*', 50, 40, 50, 40, 40, 60, 60], // Item, HSN/SAC, Qty, Rate, SGST%, CGST%, Amount, Total
          body: [
            // Header Row
            [
              {
                text: 'Item & Description',
                style: 'tableHeader',
                alignment: 'left',
              },
              {
                text: 'HSN/SAC',
                style: 'tableHeader',
              },
              {
                text: 'Qty',
                style: 'tableHeader',
              },
              {
                text: 'Rate',
                style: 'tableHeader',
                alignment: 'right',
              },
              ...(isTelanganaOrder
                ? [
                    {
                      text: 'IGST %',
                      style: 'tableHeader',
                    },
                    {
                      text: 'Amount',
                      style: 'tableHeader',
                      alignment: 'right',
                    },
                    {
                      text: 'Total',
                      style: 'tableHeader',
                      alignment: 'right',
                    },
                  ]
                : [
                    {
                      text: 'SGST %',
                      style: 'tableHeader',
                    },
                    {
                      text: 'CGST %',
                      style: 'tableHeader',
                    },
                    {
                      text: 'Amount',
                      style: 'tableHeader',
                      alignment: 'right',
                    },
                    {
                      text: 'Total',
                      style: 'tableHeader',
                      alignment: 'right',
                    },
                  ]),
            ],
            // Data Rows
            ...data.items.map((item) => {
              const itemDescription = [
                item.itemName,
                item.description ? ` - ${item.description}` : '',
              ].join('');
              
              const row: any[] = [
                {
                  text: itemDescription,
                  style: 'tableCell',
                  alignment: 'left',
                },
                {
                  text: item.hsnSacCode,
                  style: 'tableCell',
                  alignment: 'center',
                },
                {
                  text: item.quantity.toString(),
                  style: 'tableCell',
                  alignment: 'center',
                },
                {
                  text: formatCurrency(item.rate),
                  style: 'tableCellRight',
                },
              ];
              
              if (isTelanganaOrder) {
                row.push(
                  {
                    text: item.igst ? `${item.igst}%` : '0%',
                    style: 'tableCell',
                    alignment: 'center',
                  },
                  {
                    text: formatCurrency(item.rate * item.quantity),
                    style: 'tableCellRight',
                  },
                  {
                    text: formatCurrency(item.amount),
                    style: 'tableCellRight',
                  }
                );
              } else {
                row.push(
                  {
                    text: item.sgst ? `${item.sgst}%` : '0%',
                    style: 'tableCell',
                    alignment: 'center',
                  },
                  {
                    text: item.cgst ? `${item.cgst}%` : '0%',
                    style: 'tableCell',
                    alignment: 'center',
                  },
                  {
                    text: formatCurrency(item.rate * item.quantity),
                    style: 'tableCellRight',
                  },
                  {
                    text: formatCurrency(item.amount),
                    style: 'tableCellRight',
                  }
                );
              }
              
              return row;
            }),
          ],
        },
        layout: {
          hLineWidth: (i: number, node: any) => {
            if (i === 0 || i === node.table.body.length) return 0.5; // Top and bottom borders
            return 0.1; // Row borders
          },
          vLineWidth: () => 0.5,
          hLineColor: () => '#000000',
          vLineColor: () => '#000000',
          paddingLeft: () => 5,
          paddingRight: () => 5,
          paddingTop: () => 5,
          paddingBottom: () => 5,
        },
        margin: [0, 0, 0, 15],
      },
      
      // ============================================
      // TOTALS SECTION - EXACT TEMPLATE FORMAT
      // ============================================
      {
        columns: [
          {
            width: '*',
            text: '', // Empty space
          },
          {
            width: 'auto',
            table: {
              widths: [80, 80],
              body: [
                [
                  {
                    text: 'Subtotal:',
                    style: 'tableCell',
                    alignment: 'right',
                    border: [false, false, false, false],
                  },
                  {
                    text: formatCurrency(data.subtotal),
                    style: 'tableCellRight',
                    border: [false, false, false, false],
                  },
                ],
                ...(isTelanganaOrder && data.igstAmount
                  ? [
                      [
                        {
                          text: 'IGST:',
                          style: 'tableCell',
                          alignment: 'right',
                          border: [false, false, false, false],
                        },
                        {
                          text: formatCurrency(data.igstAmount),
                          style: 'tableCellRight',
                          border: [false, false, false, false],
                        },
                      ],
                    ]
                  : [
                      ...(data.sgstAmount
                        ? [
                            [
                              {
                                text: 'SGST:',
                                style: 'tableCell',
                                alignment: 'right',
                                border: [false, false, false, false],
                              },
                              {
                                text: formatCurrency(data.sgstAmount),
                                style: 'tableCellRight',
                                border: [false, false, false, false],
                              },
                            ],
                          ]
                        : []),
                      ...(data.cgstAmount
                        ? [
                            [
                              {
                                text: 'CGST:',
                                style: 'tableCell',
                                alignment: 'right',
                                border: [false, false, false, false],
                              },
                              {
                                text: formatCurrency(data.cgstAmount),
                                style: 'tableCellRight',
                                border: [false, false, false, false],
                              },
                            ],
                          ]
                        : []),
                    ]),
                [
                  {
                    text: 'Total:',
                    style: 'tableCell',
                    bold: true,
                    fontSize: 10,
                    alignment: 'right',
                    border: [false, false, false, false],
                  },
                  {
                    text: formatCurrency(data.grandTotal),
                    style: 'tableCellRight',
                    bold: true,
                    fontSize: 10,
                    border: [false, false, false, false],
                  },
                ],
              ],
            },
            layout: {
              hLineWidth: () => 0,
              vLineWidth: () => 0,
            },
          },
        ],
        margin: [0, 0, 0, 10],
      },
      
      // Total in Words
      {
        text: [
          { text: 'Total in Words: ', bold: true, fontSize: 9 },
          { text: data.totalInWords, fontSize: 9 },
        ],
        margin: [0, 0, 0, 15],
      },
      
      // ============================================
      // AUTHORIZED SIGNATURE - EXACT TEMPLATE
      // ============================================
      {
        columns: [
          {
            width: '*',
            text: '', // Empty space
          },
          {
            width: 'auto',
            stack: [
              {
                text: 'Authorized Signatory',
                bold: true,
                fontSize: 9,
                alignment: 'right',
                margin: [0, 0, 0, 30],
              },
              {
                text: 'YNM Safety Pvt Ltd',
                fontSize: 8,
                alignment: 'right',
                margin: [0, 0, 0, 0],
              },
              {
                text: '(Signature & Seal)',
                fontSize: 8,
                alignment: 'right',
                italics: true,
                margin: [0, 0, 0, 0],
              },
            ],
          },
        ],
        margin: [0, 20, 0, 20],
      },
      
      // ============================================
      // NOTES SECTION - EXACT TEMPLATE FORMAT
      // ============================================
      {
        text: 'Notes:',
        style: 'subheader',
        fontSize: 10,
        bold: true,
        margin: [0, 0, 0, 5],
      },
      {
        columns: [
          // Bank Details
          {
            width: '*',
            stack: [
              {
                text: 'Bank Details:',
                bold: true,
                fontSize: 9,
                margin: [0, 0, 0, 3],
              },
              {
                text: [
                  data.bankDetails?.bankName || 'Bank Name',
                  '\n',
                  { text: 'A/C No: ', bold: true },
                  data.bankDetails?.accountNumber || 'Account Number',
                  '\n',
                  { text: 'IFSC: ', bold: true },
                  data.bankDetails?.ifscCode || 'IFSC Code',
                  '\n',
                  { text: 'Branch: ', bold: true },
                  data.bankDetails?.branch || 'Branch Name',
                ],
                fontSize: 8,
                lineHeight: 1.4,
              },
            ],
          },
          // Terms & Conditions
          {
            width: '*',
            stack: [
              {
                text: 'Terms & Conditions:',
                bold: true,
                fontSize: 9,
                margin: [0, 0, 0, 3],
              },
              {
                text: data.termsAndConditions || 'Terms and conditions apply.',
                fontSize: 8,
                lineHeight: 1.4,
              },
            ],
            margin: [10, 0, 0, 0],
          },
        ],
        margin: [0, 0, 0, 15],
      },
    ],
    footer: (currentPage: number, pageCount: number) => {
      return {
        text: `© YNM Safety Pvt Ltd – This is a computer-generated estimate. | Page ${currentPage} of ${pageCount}`,
        style: 'footer',
        alignment: 'center',
        margin: [0, 10, 0, 0],
      };
    },
  };
  
  // Initialize pdfMake (client-side only)
  const pdfMakeInstance = initializePdfMake();
  
  // Generate and download PDF
  pdfMakeInstance.createPdf(docDefinition).download(
    `YNM-EST-${data.estimateNumber.replace('/', '-')}.pdf`
  );
}

// Wrapper function for compatibility with existing code
export async function generateEstimatePDFFromQuotationData(
  data: PDFQuotationDataNew
): Promise<void> {
  const { convertToEstimatePDFData } = await import('./pdfGeneratorTemplateAdapter');
  const estimateData = convertToEstimatePDFData(data);
  generateEstimatePDF(estimateData);
}

