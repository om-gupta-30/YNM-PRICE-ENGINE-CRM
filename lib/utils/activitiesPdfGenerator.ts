import jsPDF from 'jspdf';

interface Activity {
  id: number;
  employee_id: string;
  activity_type: string;
  description: string;
  created_at: string;
  metadata?: any;
}

interface ReportData {
  activities: Activity[];
  summary: {
    totalActivities: number;
    byType: Record<string, number>;
    byEmployee: Record<string, number>;
  };
  filters: {
    employee: string;
    date: string;
    isAdmin: boolean;
    isDataAnalyst: boolean;
  };
  generatedAt: string;
}

export function generateActivitiesPDF(reportData: ReportData): Blob {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPosition = margin;
  const lineHeight = 7;
  const sectionSpacing = 10;

  // Helper function to add a new page if needed
  const checkNewPage = (requiredSpace: number = lineHeight) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // Helper function to add text with word wrap
  const addText = (text: string, fontSize: number = 10, isBold: boolean = false, color: [number, number, number] = [0, 0, 0]) => {
    doc.setFontSize(fontSize);
    doc.setTextColor(color[0], color[1], color[2]);
    if (isBold) {
      doc.setFont(undefined, 'bold');
    } else {
      doc.setFont(undefined, 'normal');
    }

    const maxWidth = pageWidth - (margin * 2);
    const lines = doc.splitTextToSize(text, maxWidth);
    
    lines.forEach((line: string) => {
      checkNewPage(lineHeight);
      doc.text(line, margin, yPosition);
      yPosition += lineHeight;
    });
  };

  // Title
  doc.setFontSize(20);
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, 'bold');
  doc.text('Activities Report', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += lineHeight * 2;

  // Report Info
  addText(`Generated: ${new Date(reportData.generatedAt).toLocaleString()}`, 10, false, [100, 100, 100]);
  yPosition += sectionSpacing;

  // Filters Section
  addText('Filters:', 12, true);
  addText(`Employee: ${reportData.filters.employee}`, 10);
  addText(`Date: ${reportData.filters.date}`, 10);
  addText(`User Type: ${reportData.filters.isAdmin ? 'Admin' : reportData.filters.isDataAnalyst ? 'Data Analyst' : 'Employee'}`, 10);
  yPosition += sectionSpacing;

  // Summary Section
  addText('Summary:', 12, true);
  addText(`Total Activities: ${reportData.summary.totalActivities}`, 10);
  yPosition += 5;

  // Activities by Type
  if (Object.keys(reportData.summary.byType).length > 0) {
    addText('Activities by Type:', 11, true);
    Object.entries(reportData.summary.byType)
      .sort(([, a], [, b]) => b - a)
      .forEach(([type, count]) => {
        addText(`  • ${type}: ${count}`, 10);
      });
    yPosition += sectionSpacing;
  }

  // Activities by Employee (only for admin)
  if (reportData.filters.isAdmin && Object.keys(reportData.summary.byEmployee).length > 0) {
    addText('Activities by Employee:', 11, true);
    Object.entries(reportData.summary.byEmployee)
      .sort(([, a], [, b]) => b - a)
      .forEach(([employee, count]) => {
        addText(`  • ${employee}: ${count}`, 10);
      });
    yPosition += sectionSpacing;
  }

  // Activities List
  addText('Activity Details:', 12, true);
  yPosition += 5;

  if (reportData.activities.length === 0) {
    addText('No activities found for the selected filters.', 10, false, [150, 150, 150]);
  } else {
    reportData.activities.forEach((activity, index) => {
      checkNewPage(lineHeight * 8); // Reserve space for activity entry

      // Activity number
      addText(`${index + 1}. Activity #${activity.id}`, 10, true);
      
      // Employee
      addText(`   Employee: ${activity.employee_id}`, 9, false, [80, 80, 80]);
      
      // Type
      addText(`   Type: ${activity.activity_type}`, 9, false, [80, 80, 80]);
      
      // Description
      addText(`   Description: ${activity.description}`, 9);
      
      // Timestamp
      addText(`   Time: ${activity.created_at}`, 9, false, [100, 100, 100]);
      
      // Metadata (if available and not too large)
      if (activity.metadata && Object.keys(activity.metadata).length > 0) {
        try {
          const metadataStr = JSON.stringify(activity.metadata, null, 2);
          // Limit metadata length to avoid huge PDFs
          const truncatedMetadata = metadataStr.length > 200 
            ? metadataStr.substring(0, 200) + '...' 
            : metadataStr;
          const metadataLines = doc.splitTextToSize(`   Metadata: ${truncatedMetadata}`, pageWidth - (margin * 2) - 10);
          metadataLines.forEach((line: string) => {
            checkNewPage();
            doc.setFontSize(8);
            doc.setTextColor(120, 120, 120);
            doc.text(line, margin + 5, yPosition);
            yPosition += lineHeight * 0.8;
          });
          doc.setFontSize(10);
          doc.setTextColor(0, 0, 0);
        } catch (e) {
          // Skip metadata if it can't be stringified
        }
      }

      yPosition += sectionSpacing / 2;
      
      // Add separator line
      if (index < reportData.activities.length - 1) {
        checkNewPage();
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 5;
      }
    });
  }

  // Footer on last page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${totalPages} | Generated by YNM Safety CRM System`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  // Generate PDF blob
  const pdfBlob = doc.output('blob');
  return pdfBlob;
}
