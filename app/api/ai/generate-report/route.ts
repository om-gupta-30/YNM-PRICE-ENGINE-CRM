/**
 * API Route for Generating Professional Reports from Query Results
 * Converts data tables into narrative email/report format using Gemini AI
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
// User ID will be passed via header

/**
 * Report type options
 */
export type ReportType = 'executive_summary' | 'detailed_report' | 'action_items';

/**
 * Request body interface
 */
interface GenerateReportRequest {
  data: any[];
  columns?: string[];
  title?: string;
  reportType: ReportType;
  context?: string; // Additional context about the query
  includeCharts?: boolean;
}

/**
 * POST /api/ai/generate-report
 * Generates a professional report from query results
 */
export async function POST(request: NextRequest) {
  try {
    // Get user from request
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized: User ID required' },
        { status: 401 }
      );
    }

    // Parse request body
    const body: GenerateReportRequest = await request.json();

    if (!body.data || !Array.isArray(body.data) || body.data.length === 0) {
      return NextResponse.json(
        { error: 'Data is required and must be a non-empty array' },
        { status: 400 }
      );
    }

    if (!body.reportType) {
      return NextResponse.json(
        { error: 'Report type is required' },
        { status: 400 }
      );
    }

    // Generate report using Gemini
    const report = await generateReport(
      body.data,
      body.columns,
      body.title,
      body.reportType,
      body.context,
      body.includeCharts
    );

    return NextResponse.json({
      report,
      reportType: body.reportType,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Generate Report API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate report', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Generate report using Gemini AI
 */
async function generateReport(
  data: any[],
  columns?: string[],
  title?: string,
  reportType: ReportType = 'executive_summary',
  context?: string,
  includeCharts?: boolean
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY');
  }

  const client = new GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({ model: 'gemini-1.5-pro' });

  // Prepare data summary
  const dataSummary = prepareDataSummary(data, columns);
  
  // Build prompt based on report type
  const prompt = buildReportPrompt(
    dataSummary,
    title,
    reportType,
    context,
    data.length
  );

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const response = result.response.text();
    
    // Format with company branding
    return formatReportWithBranding(response, reportType, title);
  } catch (error: any) {
    console.error('[Generate Report] Gemini error:', error);
    throw new Error(`Failed to generate report: ${error.message}`);
  }
}

/**
 * Prepare data summary for AI processing
 */
function prepareDataSummary(data: any[], columns?: string[]): string {
  if (data.length === 0) {
    return 'No data available.';
  }

  // Use provided columns or auto-detect from first row
  const actualColumns = columns || Object.keys(data[0]);
  
  // Limit data size for prompt (first 100 rows)
  const limitedData = data.slice(0, 100);
  
  // Create structured summary
  let summary = `Data Summary:\n`;
  summary += `Total Rows: ${data.length}\n`;
  summary += `Columns: ${actualColumns.join(', ')}\n\n`;
  
  // Add sample data (first 10 rows)
  summary += `Sample Data (first ${Math.min(10, limitedData.length)} rows):\n`;
  summary += `\`\`\`\n`;
  
  // Header row
  summary += actualColumns.join('\t') + '\n';
  
  // Data rows
  limitedData.slice(0, 10).forEach(row => {
    const values = actualColumns.map(col => {
      const value = row[col];
      if (value === null || value === undefined) return 'N/A';
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value);
    });
    summary += values.join('\t') + '\n';
  });
  
  summary += `\`\`\`\n\n`;
  
  // Add statistics if numeric columns exist
  const numericColumns = actualColumns.filter(col => {
    const sample = limitedData.find(row => row[col] !== null && row[col] !== undefined);
    return sample && typeof sample[col] === 'number';
  });
  
  if (numericColumns.length > 0) {
    summary += `Statistics:\n`;
    numericColumns.forEach(col => {
      const values = limitedData
        .map(row => row[col])
        .filter((v): v is number => typeof v === 'number');
      
      if (values.length > 0) {
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = sum / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);
        
        summary += `- ${col}: Sum=${sum.toLocaleString()}, Avg=${avg.toFixed(2)}, Min=${min.toLocaleString()}, Max=${max.toLocaleString()}\n`;
      }
    });
    summary += '\n';
  }
  
  if (data.length > 100) {
    summary += `\nNote: Showing summary of first 100 rows. Total dataset has ${data.length} rows.\n`;
  }
  
  return summary;
}

/**
 * Build report prompt based on type
 */
function buildReportPrompt(
  dataSummary: string,
  title?: string,
  reportType: ReportType = 'executive_summary',
  context?: string,
  rowCount?: number
): string {
  const reportTitle = title || 'Data Analysis Report';
  
  let prompt = `You are a professional business analyst. Generate a ${reportType === 'executive_summary' ? 'concise executive summary' : reportType === 'detailed_report' ? 'comprehensive detailed report' : 'actionable report with clear action items'} from the following data.\n\n`;
  
  prompt += `Report Title: ${reportTitle}\n`;
  if (context) {
    prompt += `Context: ${context}\n`;
  }
  prompt += `Total Records: ${rowCount || 'N/A'}\n\n`;
  
  prompt += `${dataSummary}\n\n`;
  
  if (reportType === 'executive_summary') {
    prompt += `Generate an executive summary (2-3 paragraphs) that:
1. Highlights key findings and insights
2. Provides high-level metrics and trends
3. Includes a brief conclusion
4. Uses professional business language
5. Format as markdown with clear sections
6. Include a header with the report title and date
7. Add company branding: "YNM Safety - Data Intelligence Report"\n\n`;
  } else if (reportType === 'detailed_report') {
    prompt += `Generate a comprehensive detailed report that:
1. Provides an executive summary section
2. Breaks down data by key dimensions
3. Includes detailed analysis of trends and patterns
4. Provides statistical insights
5. Includes visual descriptions (mention what charts would be useful)
6. Format as markdown with clear sections and headers
7. Include a header with the report title, date, and company branding: "YNM Safety - Data Intelligence Report"
8. Add a footer with generation timestamp\n\n`;
  } else { // action_items
    prompt += `Generate an actionable report with clear action items that:
1. Provides a brief summary of findings
2. Identifies key issues or opportunities
3. Lists specific, actionable recommendations
4. Prioritizes actions (High/Medium/Low)
5. Includes expected outcomes or impact
6. Format as markdown with clear sections
7. Include a header with the report title, date, and company branding: "YNM Safety - Data Intelligence Report"
8. Use bullet points and clear formatting\n\n`;
  }
  
  prompt += `Requirements:
- Use professional business language
- Be specific and data-driven
- Include actual numbers from the data
- Format as clean markdown
- Add appropriate markdown headers (##, ###)
- Use tables where appropriate
- Include a professional header and footer
- Company name: YNM Safety
- Current date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}\n\n`;
  
  prompt += `Generate the report now:`;
  
  return prompt;
}

/**
 * Format report with company branding
 */
function formatReportWithBranding(
  report: string,
  reportType: ReportType,
  title?: string
): string {
  const date = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const header = `---
# ${title || 'Data Intelligence Report'}
**YNM Safety - Data Intelligence Platform**
Generated: ${date}
Report Type: ${reportType === 'executive_summary' ? 'Executive Summary' : reportType === 'detailed_report' ? 'Detailed Report' : 'Action Items Report'}
---

`;
  
  const footer = `

---

*This report was generated automatically by YNM Safety's AI-powered data intelligence platform.*
*For questions or support, please contact your data analytics team.*
`;
  
  return header + report + footer;
}

