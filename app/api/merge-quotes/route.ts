import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

// Format currency in Indian style
function formatIndianCurrency(amount: number): string {
  const absAmount = Math.abs(amount);
  const [intPart, decPart] = absAmount.toFixed(2).split('.');
  
  let lastThree = intPart.slice(-3);
  let otherNumbers = intPart.slice(0, -3);
  
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
    otherNumbers = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  }
  
  const formatted = otherNumbers + lastThree + '.' + decPart;
  return 'Rs. ' + formatted;
}

// Convert number to words (Indian numbering system)
function numberToWords(num: number): string {
  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

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
  let result = '';

  if (integerPart >= 10000000) {
    result += convertHundreds(Math.floor(integerPart / 10000000)) + ' Crore ';
  }
  const afterCrore = integerPart % 10000000;
  if (afterCrore >= 100000) {
    result += convertHundreds(Math.floor(afterCrore / 100000)) + ' Lakh ';
  }
  const afterLakh = afterCrore % 100000;
  if (afterLakh >= 1000) {
    result += convertHundreds(Math.floor(afterLakh / 1000)) + ' Thousand ';
  }
  const remainder = afterLakh % 1000;
  if (remainder > 0) {
    result += convertHundreds(remainder);
  }

  return (result.trim() + ' Rupees Only').trim();
}

// Get HSN code based on product type
function getHSNCode(sourceTable: string): string {
  if (sourceTable === 'MBCB') {
    return '7308'; // Iron/Steel structures
  } else if (sourceTable === 'Signages') {
    return '8310'; // Sign plates
  } else if (sourceTable === 'Paint') {
    return '3208'; // Paints
  }
  return '9999';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { quoteSources } = body;

    // Validate input
    if (!quoteSources || !Array.isArray(quoteSources) || quoteSources.length < 2) {
      return NextResponse.json(
        { error: 'Please select at least 2 quotations to merge' },
        { status: 400 }
      );
    }

    let supabase;
    try {
      supabase = createSupabaseServerClient();
    } catch (error: any) {
      console.error('Error creating Supabase client:', error);
      return NextResponse.json(
        { error: 'Database connection error' },
        { status: 500 }
      );
    }

    // Group IDs by table
    const mbcbIds = quoteSources.filter((q: any) => q.table === 'mbcb').map((q: any) => q.id);
    const signagesIds = quoteSources.filter((q: any) => q.table === 'signages').map((q: any) => q.id);
    const paintIds = quoteSources.filter((q: any) => q.table === 'paint').map((q: any) => q.id);

    // Fetch from each table in parallel
    const [mbcbResult, signagesResult, paintResult] = await Promise.all([
      mbcbIds.length > 0
        ? supabase.from('quotes_mbcb').select('*').in('id', mbcbIds)
        : { data: [], error: null },
      signagesIds.length > 0
        ? supabase.from('quotes_signages').select('*').in('id', signagesIds)
        : { data: [], error: null },
      paintIds.length > 0
        ? supabase.from('quotes_paint').select('*').in('id', paintIds)
        : { data: [], error: null },
    ]);

    if (mbcbResult.error) {
      console.error('Error fetching MBCB quotes:', mbcbResult.error);
      return NextResponse.json({ error: 'Failed to fetch MBCB quotations' }, { status: 500 });
    }
    if (signagesResult.error) {
      console.error('Error fetching Signages quotes:', signagesResult.error);
      return NextResponse.json({ error: 'Failed to fetch Signages quotations' }, { status: 500 });
    }
    if (paintResult.error) {
      console.error('Error fetching Paint quotes:', paintResult.error);
      return NextResponse.json({ error: 'Failed to fetch Paint quotations' }, { status: 500 });
    }

    // Combine all quotes
    const allQuotes = [
      ...(mbcbResult.data || []).map((q: any) => ({ ...q, source_table: 'MBCB' })),
      ...(signagesResult.data || []).map((q: any) => ({ ...q, source_table: 'Signages' })),
      ...(paintResult.data || []).map((q: any) => ({ ...q, source_table: 'Paint' })),
    ];

    if (allQuotes.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 quotations are required for merging' },
        { status: 400 }
      );
    }

    // === VALIDATION: Same place of supply ===
    const placeOfSupplyKeys = allQuotes.map(q => `${q.state_id || 'null'}-${q.city_id || 'null'}`);
    const uniquePlaces = new Set(placeOfSupplyKeys);
    if (uniquePlaces.size > 1) {
      return NextResponse.json(
        { error: 'All quotations must have the same Place of Supply to merge' },
        { status: 400 }
      );
    }

    // === VALIDATION: Same estimate date ===
    const estimateDates = allQuotes.map(q => {
      const payload = q.raw_payload || {};
      return payload.estimateDate || payload.quotationDate || q.date || '';
    });
    const uniqueEstimateDates = new Set(estimateDates.filter(d => d));
    if (uniqueEstimateDates.size > 1) {
      return NextResponse.json(
        { error: 'All quotations must have the same Estimate Date to merge' },
        { status: 400 }
      );
    }

    // === VALIDATION: Same expiry date ===
    const expiryDates = allQuotes.map(q => {
      const payload = q.raw_payload || {};
      return payload.expiryDate || '';
    });
    const uniqueExpiryDates = new Set(expiryDates.filter(d => d));
    if (uniqueExpiryDates.size > 1) {
      return NextResponse.json(
        { error: 'All quotations must have the same Expiry Date to merge' },
        { status: 400 }
      );
    }

    // Get first quote for common details
    const firstQuote = allQuotes[0];
    const firstPayload = firstQuote.raw_payload || {};
    
    // Fetch state and city names for Place of Supply
    let stateName = '';
    let cityName = '';
    if (firstQuote.state_id) {
      const { data: stateData } = await supabase
        .from('states')
        .select('state_name')
        .eq('id', firstQuote.state_id)
        .single();
      stateName = stateData?.state_name || '';
    }
    if (firstQuote.city_id) {
      const { data: cityData } = await supabase
        .from('cities')
        .select('city_name')
        .eq('id', firstQuote.city_id)
        .single();
      cityName = cityData?.city_name || '';
    }

    // Get sub-account details for Ship To address
    let shipToAddress: any = {};
    let billToAddress: any = {};
    let accountId: number | null = null;
    
    if (firstQuote.sub_account_id) {
      const { data: subAccountData } = await supabase
        .from('sub_accounts')
        .select(`
          id, 
          sub_account_name, 
          account_id,
          address, 
          pincode,
          state_id,
          city_id,
          is_headquarter
        `)
        .eq('id', firstQuote.sub_account_id)
        .single();
      
      if (subAccountData) {
        accountId = subAccountData.account_id;
        
        // Get state and city names for sub-account
        let subAccountStateName = '';
        let subAccountCityName = '';
        if (subAccountData.state_id) {
          const { data: stateData } = await supabase
            .from('states')
            .select('state_name')
            .eq('id', subAccountData.state_id)
            .single();
          subAccountStateName = stateData?.state_name || '';
        }
        if (subAccountData.city_id) {
          const { data: cityData } = await supabase
            .from('cities')
            .select('city_name')
            .eq('id', subAccountData.city_id)
            .single();
          subAccountCityName = cityData?.city_name || '';
        }
        
        // Ship To = Sub-account address
        shipToAddress = {
          name: subAccountData.sub_account_name || firstQuote.customer_name || 'Customer',
          address: subAccountData.address || '',
          city: subAccountCityName,
          state: subAccountStateName,
          pincode: subAccountData.pincode || '',
        };
        
        // Get headquarter address for Bill To
        if (accountId) {
          const { data: headquarterData } = await supabase
            .from('sub_accounts')
            .select(`
              sub_account_name, 
              address, 
              pincode,
              state_id,
              city_id
            `)
            .eq('account_id', accountId)
            .eq('is_headquarter', true)
            .single();
          
          if (headquarterData) {
            let hqStateName = '';
            let hqCityName = '';
            if (headquarterData.state_id) {
              const { data: stateData } = await supabase
                .from('states')
                .select('state_name')
                .eq('id', headquarterData.state_id)
                .single();
              hqStateName = stateData?.state_name || '';
            }
            if (headquarterData.city_id) {
              const { data: cityData } = await supabase
                .from('cities')
                .select('city_name')
                .eq('id', headquarterData.city_id)
                .single();
              hqCityName = cityData?.city_name || '';
            }
            
            // Get account name
            const { data: accountData } = await supabase
              .from('accounts')
              .select('account_name, gst_number')
              .eq('id', accountId)
              .single();
            
            billToAddress = {
              name: accountData?.account_name || headquarterData.sub_account_name || 'Customer',
              address: headquarterData.address || '',
              city: hqCityName,
              state: hqStateName,
              pincode: headquarterData.pincode || '',
              gstNumber: accountData?.gst_number || '',
            };
          } else {
            // No headquarter found, use account name with sub-account address
            const { data: accountData } = await supabase
              .from('accounts')
              .select('account_name, gst_number')
              .eq('id', accountId)
              .single();
            
            billToAddress = {
              name: accountData?.account_name || shipToAddress.name,
              address: shipToAddress.address,
              city: shipToAddress.city,
              state: shipToAddress.state,
              pincode: shipToAddress.pincode,
              gstNumber: accountData?.gst_number || '',
            };
          }
        }
      }
    }
    
    // Fallback if no addresses found
    if (!billToAddress.name) {
      billToAddress = {
        name: firstQuote.sub_account_name || firstQuote.customer_name || 'Customer',
        address: '',
        city: cityName,
        state: stateName,
        pincode: '',
        gstNumber: '',
      };
    }
    if (!shipToAddress.name) {
      shipToAddress = {
        name: firstQuote.sub_account_name || firstQuote.customer_name || 'Customer',
        address: '',
        city: cityName,
        state: stateName,
        pincode: '',
      };
    }

    // Collect all terms and conditions from quotations
    const allTermsAndConditions: string[] = [];
    allQuotes.forEach((q, index) => {
      const payload = q.raw_payload || {};
      const terms = payload.termsAndConditions || payload.terms || '';
      if (terms && terms.trim()) {
        if (allQuotes.length > 1) {
          allTermsAndConditions.push(`[${q.section || q.source_table}]\n${terms.trim()}`);
        } else {
          allTermsAndConditions.push(terms.trim());
        }
      }
    });
    const combinedTerms = allTermsAndConditions.join('\n\n');

    // Get estimate date and expiry date from first quote
    const estimateDate = firstPayload.estimateDate || firstPayload.quotationDate || firstQuote.date || new Date().toLocaleDateString('en-IN');
    const expiryDate = firstPayload.expiryDate || '';
    const estimateNumber = firstPayload.estimateNumber || `YNM/MERGED/${new Date().getFullYear()}/${Date.now().toString().slice(-6)}`;
    const placeOfSupply = stateName && cityName ? `${stateName}, ${cityName}` : (stateName || cityName || 'N/A');

    // Generate PDF in standard quotation format
    const doc = new jsPDF();
    let yPos = 15;

    // === COMPANY HEADER ===
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

    // === TITLE ===
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('QUOTATION', 105, yPos, { align: 'center' });
    yPos += 10;

    // === QUOTATION DETAILS ===
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    doc.setFont('helvetica', 'bold');
    doc.text('Estimate #:', 15, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(estimateNumber, 45, yPos);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Place of Supply:', 110, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(placeOfSupply, 145, yPos);
    yPos += 5;
    
    doc.setFont('helvetica', 'bold');
    doc.text('Estimate Date:', 15, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(estimateDate, 45, yPos);
    yPos += 5;
    
    if (expiryDate) {
      doc.setFont('helvetica', 'bold');
      doc.text('Expiry Date:', 15, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(expiryDate, 45, yPos);
      yPos += 5;
    }
    yPos += 5;

    // === BILL TO / SHIP TO ===
    const billToX = 15;
    const shipToX = 110;
    const addressStartY = yPos;
    
    // Bill To (Headquarter Address)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Bill To:', billToX, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    if (billToAddress.name) {
      doc.text(billToAddress.name, billToX, yPos);
      yPos += 4;
    }
    if (billToAddress.address) {
      const billAddr = doc.splitTextToSize(billToAddress.address, 80);
      doc.text(billAddr, billToX, yPos);
      yPos += billAddr.length * 4;
    }
    if (billToAddress.city || billToAddress.state) {
      doc.text(`${billToAddress.city || ''}${billToAddress.city && billToAddress.state ? ', ' : ''}${billToAddress.state || ''}`, billToX, yPos);
      yPos += 4;
    }
    if (billToAddress.pincode) {
      doc.text(`PIN: ${billToAddress.pincode}`, billToX, yPos);
      yPos += 4;
    }
    if (billToAddress.gstNumber) {
      doc.text(`GSTIN: ${billToAddress.gstNumber}`, billToX, yPos);
      yPos += 4;
    }
    
    const billToEndY = yPos;
    
    // Ship To (Sub-account Address)
    yPos = addressStartY;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Ship To:', shipToX, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    if (shipToAddress.name) {
      doc.text(shipToAddress.name, shipToX, yPos);
      yPos += 4;
    }
    if (shipToAddress.address) {
      const shipAddr = doc.splitTextToSize(shipToAddress.address, 80);
      doc.text(shipAddr, shipToX, yPos);
      yPos += shipAddr.length * 4;
    }
    if (shipToAddress.city || shipToAddress.state) {
      doc.text(`${shipToAddress.city || ''}${shipToAddress.city && shipToAddress.state ? ', ' : ''}${shipToAddress.state || ''}`, shipToX, yPos);
      yPos += 4;
    }
    if (shipToAddress.pincode) {
      doc.text(`PIN: ${shipToAddress.pincode}`, shipToX, yPos);
    }
    
    yPos = Math.max(billToEndY, yPos) + 10;

    // === ITEMS TABLE ===
    const tableData = allQuotes.map((q) => {
      const payload = q.raw_payload || {};
      let description = q.section || q.source_table;
      let quantity = 1;
      let unit = 'Nos';
      let rate = q.final_total_cost || 0;
      let amount = q.final_total_cost || 0;
      
      // Build description and get quantity based on product type
      if (q.source_table === 'MBCB') {
        const parts: string[] = [];
        if (payload.includeWBeam && payload.wBeamResult?.found) parts.push('W-Beam');
        if (payload.includeThrieBeam && payload.thrieBeamResult?.found) parts.push('Thrie-Beam');
        if (payload.includePost && payload.postResult?.found) parts.push('Post');
        if (payload.includeSpacer && payload.spacerResult?.found) parts.push('Spacer');
        if (parts.length > 0) description += ` (${parts.join(', ')})`;
        
        if (q.quantity_rm) {
          quantity = q.quantity_rm;
          unit = 'RM';
          rate = q.total_cost_per_rm || (amount / quantity);
        }
      } else if (q.source_table === 'Signages') {
        if (payload.boardType) description = payload.boardType;
        if (payload.shape) description += ` - ${payload.shape}`;
        if (payload.quantity) {
          quantity = payload.quantity;
          unit = 'Nos';
          rate = payload.costPerPiece || (amount / quantity);
        }
      } else if (q.source_table === 'Paint') {
        if (payload.paintType) description = payload.paintType;
        if (payload.quantity) {
          quantity = payload.quantity;
          unit = 'Sq.ft';
          rate = payload.costPerSqFt || (amount / quantity);
        }
      }
      
      return [
        description,
        quantity.toString(),
        unit,
        getHSNCode(q.source_table),
        formatIndianCurrency(rate),
        formatIndianCurrency(amount),
      ];
    });

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

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // === PRICE BREAKDOWN ===
    const subtotal = allQuotes.reduce((sum, q) => sum + (q.final_total_cost || 0), 0);
    const isTelangana = stateName.toLowerCase().includes('telangana');
    
    let sgst = 0;
    let cgst = 0;
    let igst = 0;
    
    if (isTelangana) {
      sgst = subtotal * 0.09;
      cgst = subtotal * 0.09;
    } else {
      igst = subtotal * 0.18;
    }
    
    const totalAmount = subtotal + sgst + cgst + igst;
    
    const priceX = 120;
    const valueX = 190;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    doc.text('Subtotal:', priceX, yPos);
    doc.text(formatIndianCurrency(subtotal), valueX, yPos, { align: 'right' });
    yPos += 5;

    if (sgst > 0) {
      doc.text('SGST (9%):', priceX, yPos);
      doc.text(formatIndianCurrency(sgst), valueX, yPos, { align: 'right' });
      yPos += 5;
    }

    if (cgst > 0) {
      doc.text('CGST (9%):', priceX, yPos);
      doc.text(formatIndianCurrency(cgst), valueX, yPos, { align: 'right' });
      yPos += 5;
    }

    if (igst > 0) {
      doc.text('IGST (18%):', priceX, yPos);
      doc.text(formatIndianCurrency(igst), valueX, yPos, { align: 'right' });
      yPos += 5;
    }

    // Total
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Total:', priceX, yPos);
    doc.text(formatIndianCurrency(totalAmount), valueX, yPos, { align: 'right' });
    yPos += 8;

    // Amount in Words
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Amount in Words:', 15, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    const amountWords = numberToWords(Math.round(totalAmount));
    const wordsLines = doc.splitTextToSize(amountWords, 180);
    doc.text(wordsLines, 15, yPos);
    yPos += wordsLines.length * 4 + 8;

    // Check if we need a new page
    if (yPos > 220) {
      doc.addPage();
      yPos = 20;
    }

    // === BANK DETAILS ===
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

    // === TERMS AND CONDITIONS (from user's quotations) ===
    if (combinedTerms) {
      if (yPos > 200) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Terms and Conditions:', 15, yPos);
      yPos += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      
      const termsLines = doc.splitTextToSize(combinedTerms, 180);
      
      // Check if terms will fit on current page
      const termsHeight = termsLines.length * 4;
      if (yPos + termsHeight > 270) {
        doc.addPage();
        yPos = 20;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('Terms and Conditions (continued):', 15, yPos);
        yPos += 5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
      }
      
      doc.text(termsLines, 15, yPos);
      yPos += termsLines.length * 4 + 10;
    }

    // === AUTHORIZED SIGNATURE ===
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

    // Convert to buffer and return as PDF
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="YNM-Quotation-${estimateNumber.replace(/\//g, '-')}.pdf"`,
      },
    });

  } catch (error: any) {
    console.error('Error in merge-quotes API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
