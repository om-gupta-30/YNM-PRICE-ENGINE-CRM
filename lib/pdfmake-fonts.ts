'use client';

import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

export function initPdfMake() {
  if (typeof window === "undefined") return null;

  if (!pdfMake.vfs) {
    pdfMake.vfs = (pdfFonts as any).pdfMake.vfs;
  }

  return pdfMake;
}

