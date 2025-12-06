/**
 * Data Result Table Component
 * 
 * A comprehensive data table component with advanced features:
 * - Sortable columns with type detection
 * - Search and filtering
 * - Pagination
 * - Export options (CSV, JSON, Copy)
 * - AI-powered report generation
 * - Summary row for numeric columns
 * 
 * Features:
 * - Auto-detects column types (text, number, date, currency, boolean)
 * - Color-coded numeric values (positive/negative)
 * - Responsive design
 * - Professional styling
 * 
 * @component
 * @example
 * ```tsx
 * <DataResultTable
 *   data={queryResults}
 *   columns={['name', 'value', 'date']}
 *   title="Query Results"
 *   userId="user123"
 *   context="Top accounts by engagement"
 * />
 * ```
 * 
 * @see {@link https://docs.ynmsafety.com/ai-features} for report generation guide
 */
'use client';

import { useState, useMemo, useCallback } from 'react';

interface DataResultTableProps {
  data: any[];
  columns?: string[];
  title?: string;
  userId?: string; // User ID for report generation
  context?: string; // Additional context about the query
}

type ReportType = 'executive_summary' | 'detailed_report' | 'action_items';

type ColumnType = 'text' | 'number' | 'date' | 'boolean' | 'currency';

interface ColumnInfo {
  name: string;
  type: ColumnType;
  isNumeric: boolean;
}

type SortDirection = 'asc' | 'desc' | null;

export default function DataResultTable({ data, columns, title, userId, context }: DataResultTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState<ReportType>('executive_summary');
  const [generatingReport, setGeneratingReport] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<string | null>(null);
  const rowsPerPage = 10;

  // Auto-detect columns if not provided
  const detectedColumns = useMemo(() => {
    if (columns && columns.length > 0) {
      return columns;
    }
    if (data.length === 0) {
      return [];
    }
    return Object.keys(data[0]);
  }, [data, columns]);

  // Detect column types
  const columnInfo = useMemo<Map<string, ColumnInfo>>(() => {
    const info = new Map<string, ColumnInfo>();
    
    detectedColumns.forEach(col => {
      const sampleValues = data
        .map(row => row[col])
        .filter(val => val !== null && val !== undefined)
        .slice(0, 10);
      
      if (sampleValues.length === 0) {
        info.set(col, { name: col, type: 'text', isNumeric: false });
        return;
      }

      // Check for boolean
      if (sampleValues.every(v => typeof v === 'boolean' || v === 'true' || v === 'false')) {
        info.set(col, { name: col, type: 'boolean', isNumeric: false });
        return;
      }

      // Check for date
      const datePattern = /^\d{4}-\d{2}-\d{2}/;
      const isDate = sampleValues.some(v => {
        if (typeof v === 'string') {
          return datePattern.test(v) || !isNaN(Date.parse(v));
        }
        return v instanceof Date;
      });
      
      if (isDate) {
        info.set(col, { name: col, type: 'date', isNumeric: false });
        return;
      }

      // Check for number/currency
      const numericValues = sampleValues.filter(v => {
        if (typeof v === 'number') return true;
        if (typeof v === 'string') {
          const cleaned = v.replace(/[₹,\s]/g, '');
          return !isNaN(parseFloat(cleaned)) && isFinite(parseFloat(cleaned));
        }
        return false;
      });

      if (numericValues.length === sampleValues.length) {
        const isCurrency = sampleValues.some(v => 
          typeof v === 'string' && (v.includes('₹') || v.includes('$') || v.includes(','))
        );
        info.set(col, { 
          name: col, 
          type: isCurrency ? 'currency' : 'number', 
          isNumeric: true 
        });
        return;
      }

      // Default to text
      info.set(col, { name: col, type: 'text', isNumeric: false });
    });

    return info;
  }, [data, detectedColumns]);

  // Filter and sort data
  const processedData = useMemo(() => {
    let filtered = [...data];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(row =>
        detectedColumns.some(col => {
          const value = row[col];
          if (value === null || value === undefined) return false;
          return String(value).toLowerCase().includes(term);
        })
      );
    }

    // Apply sorting
    if (sortColumn && sortDirection) {
      filtered.sort((a, b) => {
        const colInfo = columnInfo.get(sortColumn);
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];

        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        let comparison = 0;

        if (colInfo?.type === 'number' || colInfo?.type === 'currency') {
          const aNum = typeof aVal === 'number' ? aVal : parseFloat(String(aVal).replace(/[₹,\s]/g, '')) || 0;
          const bNum = typeof bVal === 'number' ? bVal : parseFloat(String(bVal).replace(/[₹,\s]/g, '')) || 0;
          comparison = aNum - bNum;
        } else if (colInfo?.type === 'date') {
          const aDate = aVal instanceof Date ? aVal : new Date(aVal);
          const bDate = bVal instanceof Date ? bVal : new Date(bVal);
          comparison = aDate.getTime() - bDate.getTime();
        } else {
          comparison = String(aVal).localeCompare(String(bVal));
        }

        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return filtered;
  }, [data, searchTerm, sortColumn, sortDirection, detectedColumns, columnInfo]);

  // Pagination
  const totalPages = Math.ceil(processedData.length / rowsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return processedData.slice(start, start + rowsPerPage);
  }, [processedData, currentPage]);

  // Calculate summary for numeric columns
  const summaryRow = useMemo(() => {
    const summary: Record<string, { sum: number; avg: number; count: number }> = {};
    
    detectedColumns.forEach(col => {
      const info = columnInfo.get(col);
      if (info?.isNumeric) {
        const values = processedData
          .map(row => {
            const val = row[col];
            if (val === null || val === undefined) return null;
            return typeof val === 'number' ? val : parseFloat(String(val).replace(/[₹,\s]/g, '')) || null;
          })
          .filter((v): v is number => v !== null);

        if (values.length > 0) {
          summary[col] = {
            sum: values.reduce((a, b) => a + b, 0),
            avg: values.reduce((a, b) => a + b, 0) / values.length,
            count: values.length,
          };
        }
      }
    });

    return summary;
  }, [processedData, detectedColumns, columnInfo]);

  // Format cell value
  const formatValue = useCallback((value: any, col: string): string => {
    if (value === null || value === undefined) return 'N/A';
    
    const info = columnInfo.get(col);
    
    if (info?.type === 'date') {
      try {
        const date = value instanceof Date ? value : new Date(value);
        return date.toLocaleDateString('en-IN', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        });
      } catch {
        return String(value);
      }
    }
    
    if (info?.type === 'number') {
      const num = typeof value === 'number' ? value : parseFloat(String(value)) || 0;
      return num.toLocaleString('en-IN');
    }
    
    if (info?.type === 'currency') {
      const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/[₹,\s]/g, '')) || 0;
      return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    
    if (info?.type === 'boolean') {
      return value === true || value === 'true' ? 'Yes' : 'No';
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    
    return String(value);
  }, [columnInfo]);

  // Handle column sort
  const handleSort = (col: string) => {
    if (sortColumn === col) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      } else {
        setSortDirection('asc');
      }
    } else {
      setSortColumn(col);
      setSortDirection('asc');
    }
  };

  // Get sort icon
  const getSortIcon = (col: string) => {
    if (sortColumn !== col) {
      return (
        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    if (sortDirection === 'asc') {
      return (
        <svg className="w-4 h-4 text-premium-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4 text-premium-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  // Export functions
  const exportToCSV = () => {
    if (processedData.length === 0) return;

    const headers = detectedColumns;
    const csvContent = [
      headers.join(','),
      ...processedData.map(row =>
        headers.map(header => {
          const value = row[header];
          if (value === null || value === undefined) return '';
          if (typeof value === 'object') return JSON.stringify(value);
          return String(value).replace(/"/g, '""');
        }).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'data'}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToJSON = () => {
    const jsonContent = JSON.stringify(processedData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'data'}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async () => {
    try {
      const text = processedData.map(row =>
        detectedColumns.map(col => formatValue(row[col], col)).join('\t')
      ).join('\n');
      
      await navigator.clipboard.writeText(text);
      // Could add toast notification here
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  // Generate report
  const generateReport = async () => {
    if (!userId) {
      alert('User ID is required to generate reports');
      return;
    }

    setGeneratingReport(true);
    try {
      const res = await fetch('/api/ai/generate-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({
          data: processedData,
          columns: detectedColumns,
          title: title || 'Data Report',
          reportType,
          context: context || `Query results with ${processedData.length} rows`,
          includeCharts: false, // Can be enhanced later
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to generate report');
      }

      const result = await res.json();
      setGeneratedReport(result.report);
      setShowReportModal(true);
    } catch (error: any) {
      console.error('Failed to generate report:', error);
      alert(`Failed to generate report: ${error.message}`);
    } finally {
      setGeneratingReport(false);
    }
  };

  // Copy report to clipboard
  const copyReportToClipboard = async () => {
    if (!generatedReport) return;
    
    try {
      await navigator.clipboard.writeText(generatedReport);
      alert('Report copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy report:', error);
      alert('Failed to copy report to clipboard');
    }
  };

  // Download report as Markdown
  const downloadReportAsMarkdown = () => {
    if (!generatedReport) return;

    const blob = new Blob([generatedReport], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'report'}-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download report as PDF (using markdown-to-pdf conversion)
  const downloadReportAsPDF = async () => {
    if (!generatedReport) return;

    try {
      // For PDF generation, we'll use a simple approach with print
      // In production, you might want to use a library like jsPDF or puppeteer
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow popups to download PDF');
        return;
      }

      // Create HTML from markdown (simple conversion)
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${title || 'Report'}</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              max-width: 800px;
              margin: 40px auto;
              padding: 20px;
              line-height: 1.6;
              color: #333;
            }
            h1, h2, h3 {
              color: #D1A85A;
              border-bottom: 2px solid #D1A85A;
              padding-bottom: 10px;
            }
            table {
              border-collapse: collapse;
              width: 100%;
              margin: 20px 0;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #D1A85A;
              color: white;
            }
            code {
              background-color: #f4f4f4;
              padding: 2px 4px;
              border-radius: 3px;
            }
            pre {
              background-color: #f4f4f4;
              padding: 10px;
              border-radius: 5px;
              overflow-x: auto;
            }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          ${generatedReport
            .replace(/\n/g, '<br>')
            .replace(/## (.*?)(<br>|$)/g, '<h2>$1</h2>')
            .replace(/### (.*?)(<br>|$)/g, '<h3>$1</h3>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
          }
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Wait for content to load, then print
      setTimeout(() => {
        printWindow.print();
      }, 250);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      alert('Failed to generate PDF. Please use the Markdown download option.');
    }
  };

  if (data.length === 0) {
    return (
      <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-8 text-center">
        <p className="text-slate-400">No data available</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-700/50 bg-gradient-to-r from-slate-800/50 to-slate-900/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {title && (
            <h3 className="text-lg font-semibold text-white">{title}</h3>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-premium-gold/50 focus:ring-2 focus:ring-premium-gold/20"
              />
              <svg
                className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Export buttons */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={exportToCSV}
                className="px-3 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-2"
                title="Export to CSV"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                CSV
              </button>
              <button
                onClick={exportToJSON}
                className="px-3 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-2"
                title="Export to JSON"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                JSON
              </button>
              <button
                onClick={copyToClipboard}
                className="px-3 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-2"
                title="Copy to clipboard"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
              </button>
              {userId && (
                <button
                  onClick={() => setShowReportModal(true)}
                  className="px-3 py-2 bg-gradient-to-r from-premium-gold to-amber-600 hover:from-amber-600 hover:to-premium-gold text-white rounded-lg text-xs font-medium transition-all flex items-center gap-2 shadow-lg shadow-premium-gold/20"
                  title="Generate professional report"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Explain in Email
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Results count */}
        <div className="mt-2 text-xs text-slate-400">
          Showing {paginatedData.length} of {processedData.length} results
          {searchTerm && ` (filtered from ${data.length} total)`}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table className="w-full min-w-[600px]">
          <thead className="sticky top-0 bg-slate-800/95 backdrop-blur-sm z-10 border-b border-slate-700/50">
            <tr>
              {detectedColumns.map(col => {
                const info = columnInfo.get(col);
                const isHighlighted = info?.isNumeric;
                return (
                  <th
                    key={col}
                    onClick={() => handleSort(col)}
                    className={`text-left py-3 px-4 text-xs font-semibold text-white cursor-pointer hover:text-premium-gold transition-colors ${
                      isHighlighted ? 'bg-slate-800/80' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="uppercase tracking-wider">
                        {col.replace(/_/g, ' ')}
                      </span>
                      {getSortIcon(col)}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30">
            {paginatedData.map((row, idx) => (
              <tr
                key={idx}
                className="hover:bg-slate-800/30 transition-colors"
              >
                {detectedColumns.map(col => {
                  const info = columnInfo.get(col);
                  const value = row[col];
                  const formatted = formatValue(value, col);
                  const isNumeric = info?.isNumeric;
                  const isPositive = isNumeric && typeof value === 'number' && value > 0;
                  const isNegative = isNumeric && typeof value === 'number' && value < 0;
                  
                  return (
                    <td
                      key={col}
                      className={`py-3 px-4 text-sm ${
                        isNumeric
                          ? 'text-right font-medium'
                          : 'text-slate-300'
                      } ${
                        isPositive
                          ? 'text-green-400'
                          : isNegative
                          ? 'text-red-400'
                          : ''
                      }`}
                    >
                      {formatted}
                    </td>
                  );
                })}
              </tr>
            ))}
            
            {/* Summary row */}
            {Object.keys(summaryRow).length > 0 && (
              <tr className="bg-slate-800/50 border-t-2 border-premium-gold/50 font-semibold">
                {detectedColumns.map(col => {
                  const summary = summaryRow[col];
                  if (summary) {
                    return (
                      <td key={col} className="py-3 px-4 text-sm text-right">
                        <div className="space-y-1">
                          <div className="text-premium-gold">
                            Sum: {formatValue(summary.sum, col)}
                          </div>
                          <div className="text-cyan-400 text-xs">
                            Avg: {formatValue(summary.avg, col)}
                          </div>
                        </div>
                      </td>
                    );
                  }
                  return <td key={col} className="py-3 px-4"></td>;
                })}
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-slate-700/50 bg-slate-800/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-400">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      currentPage === pageNum
                        ? 'bg-premium-gold text-white'
                        : 'bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Report Generation Modal */}
      {showReportModal && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
            onClick={() => {
              setShowReportModal(false);
              setGeneratedReport(null);
            }}
          />
          <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4">
            <div className="bg-slate-900 rounded-2xl border border-slate-700/50 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="p-4 border-b border-slate-700/50 bg-gradient-to-r from-premium-gold/10 to-amber-600/5">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Generate Professional Report</h3>
                  <button
                    onClick={() => {
                      setShowReportModal(false);
                      setGeneratedReport(null);
                    }}
                    className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {!generatedReport ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Report Type
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <button
                          onClick={() => setReportType('executive_summary')}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            reportType === 'executive_summary'
                              ? 'border-premium-gold bg-premium-gold/10'
                              : 'border-slate-700/50 bg-slate-800/50 hover:border-slate-600'
                          }`}
                        >
                          <div className="text-sm font-semibold text-white mb-1">Executive Summary</div>
                          <div className="text-xs text-slate-400">2-3 paragraph overview</div>
                        </button>
                        <button
                          onClick={() => setReportType('detailed_report')}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            reportType === 'detailed_report'
                              ? 'border-premium-gold bg-premium-gold/10'
                              : 'border-slate-700/50 bg-slate-800/50 hover:border-slate-600'
                          }`}
                        >
                          <div className="text-sm font-semibold text-white mb-1">Detailed Report</div>
                          <div className="text-xs text-slate-400">Comprehensive analysis</div>
                        </button>
                        <button
                          onClick={() => setReportType('action_items')}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            reportType === 'action_items'
                              ? 'border-premium-gold bg-premium-gold/10'
                              : 'border-slate-700/50 bg-slate-800/50 hover:border-slate-600'
                          }`}
                        >
                          <div className="text-sm font-semibold text-white mb-1">Action Items</div>
                          <div className="text-xs text-slate-400">Prioritized recommendations</div>
                        </button>
                      </div>
                    </div>

                    <div className="pt-4">
                      <button
                        onClick={generateReport}
                        disabled={generatingReport}
                        className="w-full px-4 py-3 bg-gradient-to-r from-premium-gold to-amber-600 hover:from-amber-600 hover:to-premium-gold text-white rounded-lg font-semibold transition-all shadow-lg shadow-premium-gold/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {generatingReport ? (
                          <>
                            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                            </svg>
                            Generating Report...
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Generate Report
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Report Preview */}
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50 max-h-[400px] overflow-y-auto">
                      <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono">
                        {generatedReport}
                      </pre>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={copyReportToClipboard}
                        className="px-4 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy to Clipboard
                      </button>
                      <button
                        onClick={downloadReportAsMarkdown}
                        className="px-4 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download .md
                      </button>
                      <button
                        onClick={downloadReportAsPDF}
                        className="px-4 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        Download .pdf
                      </button>
                      <button
                        onClick={() => {
                          setGeneratedReport(null);
                          setReportType('executive_summary');
                        }}
                        className="px-4 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        Generate Another
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

