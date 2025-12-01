'use client';

import { TEMPLATE_IMAGES } from '../../src/pdf/templates';

// Helper function to format currency
function formatCurrency(amount: number): string {
  return amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Helper function to split address into multiple lines
function splitAddressLines(addr: any, maxWidth: number): string[] {
  if (!addr) return [];
  const lines: string[] = [];
  
  if (addr.name) lines.push(addr.name);
  if (addr.addressLine1 || addr.address) {
    const address = addr.addressLine1 || addr.address || '';
    lines.push(address);
  }
  
  const cityStateParts: string[] = [];
  if (addr.city) cityStateParts.push(addr.city);
  if (addr.state) cityStateParts.push(addr.state);
  if (addr.pincode) cityStateParts.push(`- ${addr.pincode}`);
  if (cityStateParts.length > 0) {
    lines.push(cityStateParts.join(', '));
  }
  
  if (addr.gstin) lines.push(`GSTIN: ${addr.gstin}`);
  if (addr.contact) lines.push(`Contact: ${addr.contact}`);
  
  return lines;
}

// Interface for PDF data
export interface YNMESTPDFData {
  estimateNumber: string;
  estimateDate: string;
  expiryDate: string;
  placeOfSupply: string;
  billTo?: {
    name?: string;
    address?: string;
    addressLine1?: string;
    city?: string;
    state?: string;
    pincode?: string;
    gstin?: string;
    contact?: string;
  };
  shipTo?: {
    name?: string;
    address?: string;
    addressLine1?: string;
    city?: string;
    state?: string;
    pincode?: string;
    gstin?: string;
    contact?: string;
  };
  items: Array<{
    itemName: string;
    description?: string;
    hsnSacCode?: string;
    quantity: number;
    rate: number;
    igst?: number;
    sgst?: number;
    cgst?: number;
    amount: number;
    taxPercent?: number;
    taxAmount?: number;
  }>;
  subtotal: number;
  igstAmount?: number;
  sgstAmount?: number;
  cgstAmount?: number;
  grandTotal: number;
  totalInWords: string;
  termsAndConditions?: string;
  bankDetails?: {
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    branch?: string;
  };
  igstPercent?: number;
  finalTotal?: number;
}

// Helper function to check if place of supply is Telangana
function isTelangana(placeOfSupply: string): boolean {
  if (!placeOfSupply) return false;
  const place = placeOfSupply.toLowerCase();
  return place.includes('telangana') || place.includes('hyderabad');
}

export async function generateYNMESTPDF(data: YNMESTPDFData | any) {
  // Dynamic import for client-side only
  const pdfMake = (await import("pdfmake/build/pdfmake")).default;
  const pdfFonts = (await import("pdfmake/build/vfs_fonts")).default;
  
  // Initialize pdfMake fonts and configure Roboto
  (pdfMake as any).vfs = (pdfFonts as any).pdfMake?.vfs || pdfFonts;

  // Configure Roboto font
  (pdfMake as any).fonts = {
    Roboto: {
      normal: 'Roboto-Regular.ttf',
      bold: 'Roboto-Medium.ttf',
      italics: 'Roboto-Italic.ttf',
      bolditalics: 'Roboto-MediumItalic.ttf',
    },
  };

  // Define template images in VFS
  const images: any = {
    page1: TEMPLATE_IMAGES.page1,
    page2: TEMPLATE_IMAGES.page2,
  };

  // Add images to VFS
  pdfMake.vfs = {
    ...pdfMake.vfs,
    ...images,
  };

  // Determine if Telangana order
  const isTelanganaOrder = isTelangana(data.placeOfSupply || '');

  // Calculate tax amounts
  let calculatedSubtotal = data.subtotal || 0;
  let calculatedIgstAmount = 0;
  let calculatedSgstAmount = 0;
  let calculatedCgstAmount = 0;
  let calculatedGrandTotal = data.grandTotal || data.finalTotal || 0;

  // Calculate tax based on place of supply
  if (isTelanganaOrder) {
    const igstPercent = data.igstPercent || 18;
    calculatedIgstAmount = data.igstAmount || (calculatedSubtotal * igstPercent) / 100;
    if (!data.grandTotal && !data.finalTotal) {
      calculatedGrandTotal = calculatedSubtotal + calculatedIgstAmount;
    }
  } else {
    const sgstPercent = 9;
    const cgstPercent = 9;
    calculatedSgstAmount = data.sgstAmount || (calculatedSubtotal * sgstPercent) / 100;
    calculatedCgstAmount = data.cgstAmount || (calculatedSubtotal * cgstPercent) / 100;
    if (!data.grandTotal && !data.finalTotal) {
      calculatedGrandTotal = calculatedSubtotal + calculatedSgstAmount + calculatedCgstAmount;
    }
  }

  // Split items into pages (max 12 items per page 1, 15 per continuation page)
  const ITEMS_PER_PAGE_1 = 12;
  const ITEMS_PER_PAGE_CONT = 15;
  const itemsPages: any[][] = [];
  if (data.items && Array.isArray(data.items)) {
    // First 12 items go to page 1
    if (data.items.length > 0) {
      itemsPages.push(data.items.slice(0, ITEMS_PER_PAGE_1));
    }
    // Remaining items go to page 2 (15 per page)
    for (let i = ITEMS_PER_PAGE_1; i < data.items.length; i += ITEMS_PER_PAGE_CONT) {
      itemsPages.push(data.items.slice(i, i + ITEMS_PER_PAGE_CONT));
    }
  }

  // Build page 1 content with absolute positioning
  const page1Content: any[] = [];

  // Meta Information Section - PAGE 1 (Y ~273)
  if (data.estimateNumber) {
    page1Content.push({
      text: data.estimateNumber,
      absolutePosition: { x: 80, y: 273 },
      fontSize: 9,
      font: 'Roboto',
    });
  }
  
  if (data.estimateDate) {
    page1Content.push({
      text: data.estimateDate,
      absolutePosition: { x: 290, y: 273 },
      fontSize: 9,
      font: 'Roboto',
    });
  }
  
  if (data.expiryDate) {
    page1Content.push({
      text: data.expiryDate,
      absolutePosition: { x: 145, y: 290 },
      fontSize: 9,
      font: 'Roboto',
    });
  }
  
  if (data.placeOfSupply) {
    page1Content.push({
      text: data.placeOfSupply,
      absolutePosition: { x: 520, y: 273 },
      fontSize: 9,
      font: 'Roboto',
      maxWidth: 70,
    });
  }

  // Bill To Section - PAGE 1 (starts Y ~360, line height: 14 points, max width: 220)
  if (data.billTo) {
    const billToLines = splitAddressLines(data.billTo, 220);
    billToLines.forEach((line, index) => {
      page1Content.push({
        text: line,
        absolutePosition: { x: 62, y: 360 + (index * 14) },
        fontSize: 9,
        font: 'Roboto',
        maxWidth: 220,
      });
    });
  }

  // Ship To Section - PAGE 1 (starts Y ~360, line height: 14 points, max width: 220)
  if (data.shipTo) {
    const shipToLines = splitAddressLines(data.shipTo, 220);
    shipToLines.forEach((line, index) => {
      page1Content.push({
        text: line,
        absolutePosition: { x: 310, y: 360 + (index * 14) },
        fontSize: 9,
        font: 'Roboto',
        maxWidth: 220,
      });
    });
  }

  // Items Table - PAGE 1 (first data row starts Y=538, row height: 18 points, max 12 rows)
  if (itemsPages.length > 0) {
    const firstPageItems = itemsPages[0];
    firstPageItems.forEach((item, index) => {
      const rowY = 538 + (index * 18);
      
      // Column 1: "#" (X=40)
      page1Content.push({
        text: (index + 1).toString(),
        absolutePosition: { x: 40, y: rowY },
        fontSize: 8,
        font: 'Roboto',
        alignment: 'center',
      });

      // Column 2: "Item & Description" (X=70, maxWidth=210)
      const itemDesc = item.description 
        ? `${item.itemName} - ${item.description}`
        : item.itemName || '';
      page1Content.push({
        text: itemDesc,
        absolutePosition: { x: 70, y: rowY },
        fontSize: 8,
        font: 'Roboto',
        maxWidth: 210,
      });

      // Column 3: "HSN/SAC" (X=285, width=50)
      page1Content.push({
        text: item.hsnSacCode || '',
        absolutePosition: { x: 285, y: rowY },
        fontSize: 8,
        font: 'Roboto',
        alignment: 'center',
        maxWidth: 50,
      });

      // Column 4: "Qty" (X=340, width=40, center-align)
      page1Content.push({
        text: item.quantity ? item.quantity.toString() : '',
        absolutePosition: { x: 340, y: rowY },
        fontSize: 8,
        font: 'Roboto',
        alignment: 'center',
        maxWidth: 40,
      });

      // Column 5: "Rate" (X=385, width=60, right-align)
      page1Content.push({
        text: item.rate ? formatCurrency(item.rate) : '',
        absolutePosition: { x: 385, y: rowY },
        fontSize: 8,
        font: 'Roboto',
        alignment: 'right',
        maxWidth: 60,
      });

      // Column 6: "IGST %" (X=450, width=45, center-align) - shows 18% for Telangana, or CGST/SGST for others
      const taxPercent = item.igst || item.sgst || item.cgst || item.taxPercent || 0;
      if (isTelanganaOrder) {
        page1Content.push({
          text: taxPercent > 0 ? `${taxPercent}%` : '18%',
          absolutePosition: { x: 450, y: rowY },
          fontSize: 8,
          font: 'Roboto',
          alignment: 'center',
          maxWidth: 45,
        });
      } else {
        const sgst = item.sgst || 9;
        const cgst = item.cgst || 9;
        page1Content.push({
          text: `${cgst}%/${sgst}%`,
          absolutePosition: { x: 450, y: rowY },
          fontSize: 8,
          font: 'Roboto',
          alignment: 'center',
          maxWidth: 45,
        });
      }

      // Column 7: "Amt" - Tax Amount (X=500, width=50, right-align)
      let taxAmount = 0;
      if (item.taxAmount !== undefined) {
        taxAmount = item.taxAmount;
      } else if (taxPercent > 0) {
        // Calculate tax from the total amount (amount includes tax)
        if (isTelanganaOrder) {
          taxAmount = (item.amount * taxPercent) / (100 + taxPercent);
        } else {
          const sgst = item.sgst || 9;
          const cgst = item.cgst || 9;
          taxAmount = (item.amount * (sgst + cgst)) / (100 + sgst + cgst);
        }
      }
      page1Content.push({
        text: formatCurrency(taxAmount),
        absolutePosition: { x: 500, y: rowY },
        fontSize: 8,
        font: 'Roboto',
        alignment: 'right',
        maxWidth: 50,
      });

      // Column 8: "Amount" - Total Amount (X=555, width=40, right-align)
      page1Content.push({
        text: item.amount ? formatCurrency(item.amount) : '',
        absolutePosition: { x: 555, y: rowY },
        fontSize: 8,
        font: 'Roboto',
        alignment: 'right',
        maxWidth: 40,
      });
    });
  }

  // Build page 2 content with absolute positioning
  const page2Content: any[] = [];

  // Continuation Items Table on Page 2 (if needed, starts Y=80, max 15 rows)
  if (itemsPages.length > 1) {
    const continuationItems = itemsPages.slice(1).flat(); // Flatten all continuation pages
    continuationItems.slice(0, ITEMS_PER_PAGE_CONT).forEach((item, index) => {
      const rowY = 80 + (index * 18);
      
      // Column 1: "#" (X=40)
      page2Content.push({
        text: (ITEMS_PER_PAGE_1 + index + 1).toString(),
        absolutePosition: { x: 40, y: rowY },
        fontSize: 8,
        font: 'Roboto',
        alignment: 'center',
      });

      // Column 2: "Item & Description" (X=70, maxWidth=210)
      const itemDesc = item.description 
        ? `${item.itemName} - ${item.description}`
        : item.itemName || '';
      page2Content.push({
        text: itemDesc,
        absolutePosition: { x: 70, y: rowY },
        fontSize: 8,
        font: 'Roboto',
        maxWidth: 210,
      });

      // Column 3: "HSN/SAC" (X=285, width=50)
      page2Content.push({
        text: item.hsnSacCode || '',
        absolutePosition: { x: 285, y: rowY },
        fontSize: 8,
        font: 'Roboto',
        alignment: 'center',
        maxWidth: 50,
      });

      // Column 4: "Qty" (X=340, width=40, center-align)
      page2Content.push({
        text: item.quantity ? item.quantity.toString() : '',
        absolutePosition: { x: 340, y: rowY },
        fontSize: 8,
        font: 'Roboto',
        alignment: 'center',
        maxWidth: 40,
      });

      // Column 5: "Rate" (X=385, width=60, right-align)
      page2Content.push({
        text: item.rate ? formatCurrency(item.rate) : '',
        absolutePosition: { x: 385, y: rowY },
        fontSize: 8,
        font: 'Roboto',
        alignment: 'right',
        maxWidth: 60,
      });

      // Column 6: "IGST %" (X=450, width=45, center-align)
      const taxPercent = item.igst || item.sgst || item.cgst || item.taxPercent || 0;
      if (isTelanganaOrder) {
        page2Content.push({
          text: taxPercent > 0 ? `${taxPercent}%` : '18%',
          absolutePosition: { x: 450, y: rowY },
          fontSize: 8,
          font: 'Roboto',
          alignment: 'center',
          maxWidth: 45,
        });
      } else {
        const sgst = item.sgst || 9;
        const cgst = item.cgst || 9;
        page2Content.push({
          text: `${cgst}%/${sgst}%`,
          absolutePosition: { x: 450, y: rowY },
          fontSize: 8,
          font: 'Roboto',
          alignment: 'center',
          maxWidth: 45,
        });
      }

      // Column 7: "Amt" - Tax Amount (X=500, width=50, right-align)
      let taxAmount = 0;
      if (item.taxAmount !== undefined) {
        taxAmount = item.taxAmount;
      } else if (taxPercent > 0) {
        if (isTelanganaOrder) {
          taxAmount = (item.amount * taxPercent) / (100 + taxPercent);
        } else {
          const sgst = item.sgst || 9;
          const cgst = item.cgst || 9;
          taxAmount = (item.amount * (sgst + cgst)) / (100 + sgst + cgst);
        }
      }
      page2Content.push({
        text: formatCurrency(taxAmount),
        absolutePosition: { x: 500, y: rowY },
        fontSize: 8,
        font: 'Roboto',
        alignment: 'right',
        maxWidth: 50,
      });

      // Column 8: "Amount" - Total Amount (X=555, width=40, right-align)
      page2Content.push({
        text: item.amount ? formatCurrency(item.amount) : '',
        absolutePosition: { x: 555, y: rowY },
        fontSize: 8,
        font: 'Roboto',
        alignment: 'right',
        maxWidth: 40,
      });
    });
  }

  // Total In Words Section - PAGE 2 (Y~680)
  if (data.totalInWords) {
    page2Content.push({
      text: 'Total In Words',
      absolutePosition: { x: 62, y: 680 },
      fontSize: 9,
      font: 'Roboto',
      bold: true,
    });
    
    page2Content.push({
      text: data.totalInWords,
      absolutePosition: { x: 62, y: 698 },
      fontSize: 9,
      font: 'Roboto',
      maxWidth: 340,
    });
  }

  // Totals Section - PAGE 2 (bottom-right, Y starts ~680)
  // Sub Total: label X=420, value X=520 (right-align), Y=680
  page2Content.push({
    text: 'Sub Total',
    absolutePosition: { x: 420, y: 680 },
    fontSize: 9,
    font: 'Roboto',
  });
  page2Content.push({
    text: formatCurrency(calculatedSubtotal),
    absolutePosition: { x: 520, y: 680 },
    fontSize: 9,
    font: 'Roboto',
    alignment: 'right',
  });

  // Tax: label X=420, value X=520, Y=698
  if (isTelanganaOrder && calculatedIgstAmount > 0) {
    page2Content.push({
      text: 'IGST18 (18%)',
      absolutePosition: { x: 420, y: 698 },
      fontSize: 9,
      font: 'Roboto',
    });
    page2Content.push({
      text: formatCurrency(calculatedIgstAmount),
      absolutePosition: { x: 520, y: 698 },
      fontSize: 9,
      font: 'Roboto',
      alignment: 'right',
    });
  } else if (!isTelanganaOrder) {
    const totalTax = calculatedSgstAmount + calculatedCgstAmount;
    page2Content.push({
      text: 'CGST9 (18%)',
      absolutePosition: { x: 420, y: 698 },
      fontSize: 9,
      font: 'Roboto',
    });
    page2Content.push({
      text: formatCurrency(totalTax),
      absolutePosition: { x: 520, y: 698 },
      fontSize: 9,
      font: 'Roboto',
      alignment: 'right',
    });
  }

  // Total: label X=420, value X=520 (bold), Y=716
  page2Content.push({
    text: 'Total',
    absolutePosition: { x: 420, y: 716 },
    fontSize: 9,
    font: 'Roboto',
    bold: true,
  });
  page2Content.push({
    text: formatCurrency(calculatedGrandTotal),
    absolutePosition: { x: 520, y: 716 },
    fontSize: 9,
    font: 'Roboto',
    bold: true,
    alignment: 'right',
  });

  // Authorized Signature - PAGE 2 (X=480, Y=720, right-align)
  page2Content.push({
    text: 'Authorized Signatory',
    absolutePosition: { x: 480, y: 720 },
    fontSize: 9,
    font: 'Roboto',
    alignment: 'right',
  });

  // Bank Details Section - PAGE 2 (Y~770)
  if (data.bankDetails) {
    const accountName = (data.bankDetails as any).accountName || '';
    const bankName = data.bankDetails.bankName || '';
    const accountNumber = data.bankDetails.accountNumber || '';
    const ifscCode = data.bankDetails.ifscCode || '';
    const branch = data.bankDetails.branch || '';
    
    page2Content.push({
      text: 'Bank Details.',
      absolutePosition: { x: 62, y: 770 },
      fontSize: 9,
      font: 'Roboto',
      bold: true,
    });
    
    if (accountName) {
      page2Content.push({
        text: `Account Name: ${accountName}`,
        absolutePosition: { x: 62, y: 788 },
        fontSize: 9,
        font: 'Roboto',
      });
    }
    
    if (bankName) {
      page2Content.push({
        text: `Bank Name: ${bankName}`,
        absolutePosition: { x: 62, y: 800 },
        fontSize: 9,
        font: 'Roboto',
      });
    }
    
    if (accountNumber) {
      page2Content.push({
        text: `Account Number: ${accountNumber}`,
        absolutePosition: { x: 62, y: 812 },
        fontSize: 9,
        font: 'Roboto',
      });
    }
    
    if (ifscCode) {
      page2Content.push({
        text: `IFSC Code: ${ifscCode}`,
        absolutePosition: { x: 62, y: 824 },
        fontSize: 9,
        font: 'Roboto',
      });
    }
    
    if (branch) {
      page2Content.push({
        text: `Branch: ${branch}`,
        absolutePosition: { x: 62, y: 836 },
        fontSize: 9,
        font: 'Roboto',
      });
    }
  }

  // Terms & Conditions Section - PAGE 2 (bottom of page, Y=860 header, Y=875 content)
  if (data.termsAndConditions) {
    page2Content.push({
      text: 'Terms & Conditions',
      absolutePosition: { x: 62, y: 860 },
      fontSize: 9,
      font: 'Roboto',
      bold: true,
    });
    
    page2Content.push({
      text: data.termsAndConditions,
      absolutePosition: { x: 62, y: 875 },
      fontSize: 9,
      font: 'Roboto',
      maxWidth: 480,
    });
  }

  // Build content array with page 1 and page 2
  // Page 1 content in a stack, then page break, then page 2 content
  const content: any[] = [
    {
      stack: page1Content,
    },
    {
      text: '',
      pageBreak: 'after',
    },
    {
      stack: page2Content,
    },
  ];

  // Document Definition
  const docDefinition: any = {
    pageSize: 'A4',
    pageMargins: [0, 0, 0, 0],
    images,
    defaultStyle: {
      font: 'Roboto',
      fontSize: 9,
    },
    background: (currentPage: number) => {
      if (currentPage === 1) {
        return {
          image: 'page1',
          width: 595.28,
          height: 841.89,
        };
      } else {
        return {
          image: 'page2',
          width: 595.28,
          height: 841.89,
        };
      }
    },
    content: content,
  };

  // Generate and download PDF
  pdfMake.createPdf(docDefinition).download(`${data.estimateNumber || 'YNM-EST'}.pdf`);
}
