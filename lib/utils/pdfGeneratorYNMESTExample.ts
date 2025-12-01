// Example Usage of YNMEST PDF Generator
// This demonstrates how to use the new PDF generator that matches YNMEST-25436.pdf exactly

import { generateYNMESTPDF, YNMESTPDFData } from './pdfGeneratorYNMEST';
import { generateYNMESTPDFFromQuotationData } from './pdfGeneratorYNMEST';
import { PDFQuotationDataNew } from './pdfGeneratorNew';

// ============================================
// EXAMPLE 1: Direct Usage with YNMESTPDFData
// ============================================
export function exampleDirectUsage() {
  const estimateData: YNMESTPDFData = {
    estimateNumber: 'YNM/EST-25436',
    estimateDate: '15/01/2024',
    expiryDate: '15/02/2024',
    placeOfSupply: 'Telangana',
    
    billTo: {
      name: 'ABC Industries Pvt Ltd',
      address: '123 Industrial Area, Phase 1',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500001',
      gstin: '36AABCY1234M1Z5',
      contact: '+91-9876543210',
    },
    
    shipTo: {
      name: 'ABC Industries Pvt Ltd',
      address: '123 Industrial Area, Phase 1',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500001',
      gstin: '36AABCY1234M1Z5',
      contact: '+91-9876543210',
    },
    
    items: [
      {
        itemName: 'Metal Beam Crash Barriers (MBCB)',
        description: 'W-Beam: 2.5mm, 450GSM, 12.345kg/rm | Post: 4.5mm, 1200mm, 450GSM, 8.765kg/rm',
        hsnSacCode: '7308',
        quantity: 100,
        rate: 1250.50,
        igst: 18,
        amount: 147559.00,
      },
      {
        itemName: 'Reflective Signage Board',
        description: 'Rectangular 3000x2000mm, ACP 3mm, Digital Print',
        hsnSacCode: '3926',
        quantity: 5,
        rate: 8500.00,
        igst: 18,
        amount: 50150.00,
      },
    ],
    
    subtotal: 180000.00,
    igstAmount: 32400.00,
    grandTotal: 212400.00,
    totalInWords: 'Two Lakh Twelve Thousand Four Hundred Rupees Only',
    
    termsAndConditions: '1. Prices are valid for 30 days from the date of estimate.\n2. Payment terms: 50% advance, 50% on delivery.\n3. Delivery: 15-20 working days from order confirmation.\n4. GST extra as applicable.\n5. All disputes subject to Hyderabad jurisdiction.',
    
    bankDetails: {
      bankName: 'State Bank of India',
      accountNumber: '1234567890123456',
      ifscCode: 'SBIN0001234',
      branch: 'Hyderabad Main Branch',
    },
  };
  
  // Generate PDF - will download as YNM-EST-YNM-EST-25436.pdf
  generateYNMESTPDF(estimateData);
}

// ============================================
// EXAMPLE 2: Usage with Existing PDFQuotationDataNew
// ============================================
export async function exampleWithExistingData() {
  const quotationData: PDFQuotationDataNew = {
    estimateNumber: 'YNM/EST-25437',
    estimateDate: '20/01/2024',
    expiryDate: '20/02/2024',
    placeOfSupply: 'Maharashtra',
    productType: 'W-Beam Section',
    customerName: 'XYZ Corporation',
    createdBy: 'Admin',
    
    billTo: {
      customerName: 'XYZ Corporation',
      addressLine1: '456 Business Park',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      gstin: '27XYZAB1234M1Z6',
      phone: '+91-9876543211',
    },
    
    items: [
      {
        itemName: 'Metal Beam Crash Barriers (MBCB)',
        description: 'W-Beam: 2.5mm, 450GSM',
        hsnSacCode: '7308',
        quantity: 200,
        rate: 1200.00,
        sgst: 9,
        cgst: 9,
        amount: 283200.00,
      },
    ],
    
    subtotal: 240000.00,
    totalTax: 43200.00,
    finalTotal: 283200.00,
    totalInWords: 'Two Lakh Eighty Three Thousand Two Hundred Rupees Only',
    
    termsAndConditions: 'Terms and conditions apply as per standard policy.',
    
    bankDetails: {
      bankName: 'HDFC Bank',
      accountNumber: '9876543210987654',
      ifscCode: 'HDFC0001234',
      branch: 'Mumbai Branch',
    },
  };
  
  // Generate PDF using adapter - will download as YNM-EST-YNM-EST-25437.pdf
  await generateYNMESTPDFFromQuotationData(quotationData);
}

// ============================================
// EXAMPLE 3: Button Handler in React Component
// ============================================
export function exampleButtonHandler() {
  // In your React component (already integrated in app/mbcb/w-beam/page.tsx):
  /*
  const handleGeneratePDF = async () => {
    try {
      // Prepare your data
      const pdfData: PDFQuotationDataNew = {
        estimateNumber: currentEstimateNumber,
        estimateDate: formatDate(estimateDate),
        expiryDate: formatDate(expiryDate),
        placeOfSupply: placeOfSupply,
        productType: 'W-Beam Section',
        customerName: customerName,
        createdBy: currentUsername,
        billTo: billToAddress,
        shipTo: shipToAddress,
        items: itemsArray,
        subtotal: calculatedSubtotal,
        totalTax: calculatedTax,
        finalTotal: finalTotal,
        totalInWords: numberToWords(finalTotal),
        termsAndConditions: termsAndConditions,
        bankDetails: bankDetails,
      };
      
      // Generate PDF using YNMEST template
      await generateYNMESTPDFFromQuotationData(pdfData);
      
      // Show success message
      setToast({ 
        message: 'PDF generated successfully!', 
        type: 'success' 
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      setToast({ 
        message: 'Error generating PDF. Please try again.', 
        type: 'error' 
      });
    }
  };
  
  return (
    <button onClick={handleGeneratePDF}>
      Generate PDF
    </button>
  );
  */
}

