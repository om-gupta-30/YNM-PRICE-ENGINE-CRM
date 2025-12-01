# PDF Template Setup Guide

## Overview
The PDF generator uses the uploaded template (YNMEST-25436.pdf) as background images with absolute-positioned dynamic text overlays. This ensures pixel-perfect matching.

## Step 1: Convert PDF Pages to Images

You need to convert the PDF pages to PNG images and place them in `public/pdf-templates/`.

### Source File
- `data/master/YNMEST-25436 (1).pdf`

### Output Files Required
- `public/pdf-templates/ynm-template-page1.png` (Page 1)
- `public/pdf-templates/ynm-template-page2.png` (Page 2)

### Conversion Methods

#### Option 1: Online Tool (Easiest)
1. Go to https://www.ilovepdf.com/pdf-to-jpg or https://www.adobe.com/acrobat/online/pdf-to-jpg.html
2. Upload `data/master/YNMEST-25436 (1).pdf`
3. Extract pages as PNG (300 DPI recommended for quality)
4. Save page 1 as `public/pdf-templates/ynm-template-page1.png`
5. Save page 2 as `public/pdf-templates/ynm-template-page2.png`

#### Option 2: ImageMagick (Command Line)
```bash
# Install ImageMagick first (macOS: brew install imagemagick)
convert -density 300 "data/master/YNMEST-25436 (1).pdf[0]" public/pdf-templates/ynm-template-page1.png
convert -density 300 "data/master/YNMEST-25436 (1).pdf[1]" public/pdf-templates/ynm-template-page2.png
```

#### Option 3: Python with pdf2image
```bash
pip install pdf2image
python -c "
from pdf2image import convert_from_path
images = convert_from_path('data/master/YNMEST-25436 (1).pdf', dpi=300)
images[0].save('public/pdf-templates/ynm-template-page1.png')
images[1].save('public/pdf-templates/ynm-template-page2.png')
"
```

#### Option 4: Node.js with pdf2pic
```bash
npm install pdf2pic
node scripts/convert-pdf-to-images.js
```

## Step 2: Measure Template Coordinates

After converting to images, you need to measure the exact pixel coordinates for each dynamic field. Use an image editor or PDF viewer to get coordinates.

### Coordinate Measurement Guide

1. Open the PNG images in an image editor (Photoshop, GIMP, or online tool)
2. Measure X,Y coordinates for each field:
   - X = distance from left edge (in points, where A4 = 595 points wide)
   - Y = distance from top edge (in points, where A4 = 842 points tall)

### Fields to Measure

**Page 1:**
- Estimate # box
- Estimate Date box
- Expiry Date box
- Place of Supply box
- Bill To: Name, Address, City, GSTIN
- Ship To: Name, Address, City, GSTIN
- Table: First row Y position, row height, column X positions

**Page 2:**
- Subtotal value
- IGST/SGST/CGST value
- Total value
- Total in Words text start
- Bank Details block
- Terms & Conditions block
- Signature block

## Step 3: Update Coordinates in Code

Edit `lib/utils/pdfGeneratorYNMTemplate.ts` and update the `COORDINATES` object with your measured values.

## Step 4: Test PDF Generation

1. Fill out a quotation form
2. Click "Generate PDF"
3. Compare output with original template
4. Adjust coordinates as needed

## Notes

- Use 300 DPI for high-quality images
- A4 page size = 595 points wide × 842 points tall
- Coordinates are in points (1 point = 1/72 inch)
- Font sizes should match template (typically 8-9pt)

