import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

export async function GET(request: NextRequest) {
  try {
    // Find the Excel file
    const fileName = 'database1.xlsx';
    const possiblePaths = [
      path.resolve(process.cwd(), fileName),
      path.resolve(__dirname, '../../../../', fileName),
      path.resolve(process.cwd(), '..', fileName),
      '/Users/omg/Desktop/price engine ysm/' + fileName,
    ];

    let excelFilePath: string | null = null;
    for (const filePath of possiblePaths) {
      try {
        if (fs.existsSync(filePath)) {
          excelFilePath = filePath;
          break;
        }
      } catch (err) {
        // Continue
      }
    }

    if (!excelFilePath) {
      return NextResponse.json(
        { 
          error: 'Excel file not found: database1.xlsx',
          triedPaths: possiblePaths,
        },
        { status: 404 }
      );
    }

    // Read Excel file
    const workbook = XLSX.readFile(excelFilePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(worksheet);

    return NextResponse.json({
      success: true,
      filePath: excelFilePath,
      totalRows: rows.length,
      headers: rows.length > 0 ? Object.keys(rows[0]) : [],
      sampleRows: rows.slice(0, 5), // First 5 rows as preview
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}
