import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { PDFDocument } from 'pdf-lib';
import jsPDF from 'jspdf';
import { PDFQuotationData } from '@/lib/utils/pdfGenerator';
// Note: Full PDF generation logic needs to be copied from client-side generateProfessionalPDF
// For now, this is a placeholder that generates basic PDFs

// Helper to generate PDF buffer from quote data
async function generatePDFBufferFromQuote(quote: any, productType: 'mbcb' | 'signages' | 'paint'): Promise<Uint8Array> {
  const doc = new jsPDF();
  doc.setFont('helvetica');
  
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const marginLeft = 25;
  const marginRight = pageWidth - 25;
  const contentWidth = marginRight - marginLeft;
  const lineHeight = 8;
  
  let yPos = 30;
  
  // Helper: Format numbers
  const formatNumber = (num: number | undefined | null): string => {
    if (num === undefined || num === null || isNaN(num)) return '0.00';
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
  };
  
  // Helper: Check if new page needed
  const checkNewPage = (requiredSpace: number) => {
    if (yPos + requiredSpace > pageHeight - 50) {
      doc.addPage();
      yPos = 30;
      return true;
    }
    return false;
  };
  
  // Helper: Add spacing
  const addSpacing = (spacing: number = 10) => {
    yPos += spacing;
  };

  // Convert quote to PDFQuotationData format
  const payload = quote.raw_payload || {};
  
  // For now, generate a basic PDF - we'll need to copy the full logic from generateProfessionalPDF
  // This is a placeholder - the actual implementation needs the full PDF generation code
  
  // Add header, content, footer here...
  // For now, return a basic PDF
  doc.text('Quotation PDF', marginLeft, yPos);
  
  const buffer = doc.output('arraybuffer');
  return new Uint8Array(buffer);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids, productType } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Please provide at least one quotation ID' },
        { status: 400 }
      );
    }

    if (!productType || !['mbcb', 'signages', 'paint'].includes(productType)) {
      return NextResponse.json(
        { error: 'Invalid product type. Must be mbcb, signages, or paint' },
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
    
    // Determine table name based on product type
    const tableName = `quotes_${productType}`;
    
    // Fetch quotations from Supabase
    const { data: quotes, error } = await supabase
      .from(tableName)
      .select('*')
      .in('id', ids)
      .order('id', { ascending: true });

    if (error) {
      console.error('Error fetching quotes:', error);
      return NextResponse.json(
        { error: 'Failed to fetch quotations' },
        { status: 500 }
      );
    }

    if (!quotes || quotes.length === 0) {
      return NextResponse.json(
        { error: 'No quotations found with the provided IDs' },
        { status: 404 }
      );
    }

    // Validate all quotes are from the same product type
    const allSameType = quotes.every(q => {
      // Additional validation can be added here
      return true;
    });

    if (!allSameType) {
      return NextResponse.json(
        { error: 'Cannot merge quotations from different product types' },
        { status: 400 }
      );
    }

    // Generate PDF buffer for each quote
    const pdfBuffers: Uint8Array[] = [];
    for (const quote of quotes) {
      try {
        const buffer = await generatePDFBufferFromQuote(quote, productType);
        pdfBuffers.push(buffer);
      } catch (error) {
        console.error(`Error generating PDF for quote ${quote.id}:`, error);
        // Continue with other quotes
      }
    }

    if (pdfBuffers.length === 0) {
      return NextResponse.json(
        { error: 'Failed to generate PDFs for any quotation' },
        { status: 500 }
      );
    }

    // Merge all PDFs using pdf-lib
    const mergedPdf = await PDFDocument.create();

    for (const buffer of pdfBuffers) {
      try {
        const pdf = await PDFDocument.load(buffer);
        const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        pages.forEach((page) => mergedPdf.addPage(page));
      } catch (error) {
        console.error('Error merging PDF page:', error);
        // Continue with other pages
      }
    }

    // Save merged PDF
    const mergedPdfBytes = await mergedPdf.save();

    // Generate filename with today's date
    const today = new Date().toISOString().split('T')[0];
    const filename = `YNM-Merged-Quotations-${today}.pdf`;

    // Save merged quotation to database
    try {
      // Calculate total cost
      const totalCost = quotes.reduce((sum, q) => sum + (q.final_total_cost || 0), 0);
      
      // Get first quote's metadata (assuming all quotes have similar metadata)
      const firstQuote = quotes[0];
      
      // Prepare merged quotation data
      const mergedQuotationData = {
        merged_quote_ids: ids,
        product_type: productType,
        customer_name: firstQuote.customer_name || 'Multiple Customers',
        place_of_supply: firstQuote.place_of_supply || 'Multiple Places',
        purpose: firstQuote.purpose || '',
        date: today,
        final_total_cost: totalCost,
        created_by: firstQuote.created_by || 'System',
        is_saved: true,
        raw_payload: {
          mergedQuotes: quotes.map(q => ({
            id: q.id,
            customer_name: q.customer_name,
            place_of_supply: q.place_of_supply,
            final_total_cost: q.final_total_cost,
            section: q.section,
          })),
          totalQuotes: quotes.length,
          mergedAt: new Date().toISOString(),
        },
      };

      // Insert into merged_quotations table
      const { error: insertError } = await supabase
        .from('merged_quotations')
        .insert([mergedQuotationData]);

      if (insertError) {
        console.error('Error saving merged quotation:', insertError);
        // Don't fail the request if database save fails, just log it
      }
    } catch (dbError) {
      console.error('Error saving merged quotation to database:', dbError);
      // Continue even if database save fails
    }

    // Return PDF as response
    return new NextResponse(Buffer.from(mergedPdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
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

