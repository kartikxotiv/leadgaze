/**
 * PDF Report Utilities
 * 
 * Shared helpers for generating branded PDF reports with organization logo,
 * professional header/footer, and consistent styling across all dashboard exports.
 */

import jsPDF from 'jspdf';

// Brand colors matching the app's primary palette (#3953E7)
export const PDF_BRAND = {
  primary: [57, 83, 231] as [number, number, number],       // #3953E7
  primaryLight: [235, 239, 255] as [number, number, number], // #EBEFFF
  accent: [62, 189, 147] as [number, number, number],        // #3EBD93 (green)
  amber: [245, 158, 11] as [number, number, number],         // #F59E0B
  sky: [78, 172, 255] as [number, number, number],           // #4EACFF
  dark: [28, 32, 48] as [number, number, number],            // near-black
  gray: [100, 107, 132] as [number, number, number],         // muted gray
  lightGray: [240, 242, 248] as [number, number, number],    // background gray
  white: [255, 255, 255] as [number, number, number],
  border: [220, 224, 235] as [number, number, number],
};

export interface OrgBranding {
  name: string;
  logoUrl?: string | null;
}

/**
 * Loads an image URL and returns a base64 data URL.
 * Falls back gracefully if the image cannot be loaded (CORS, 404, etc.)
 */
export async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Extracts a Lucide icon rendered in the DOM to a PNG base64 string.
 */
export async function getIconAsBase64(id: string): Promise<string | null> {
  if (typeof document === 'undefined') return null;
  const el = document.getElementById(id);
  if (!el) return null;
  const svg = el.outerHTML;
  const svgWithXmlns = svg.includes('xmlns=') ? svg : svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  const blob = new Blob([svgWithXmlns], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 24;
      canvas.height = 24;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
      URL.revokeObjectURL(url);
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * Generates a donut chart as a PNG base64 string.
 */
export function generateDonutChartBase64(data: { value: number; color: string }[], size = 200, holeRatio = 0.6): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2;
  const holeRadius = radius * holeRatio;
  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (total === 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
    ctx.fillStyle = '#EBEFFF';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, holeRadius, 0, 2 * Math.PI);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    return canvas.toDataURL('image/png');
  }

  let startAngle = -Math.PI / 2;
  for (const d of data) {
    if (d.value === 0) continue;
    const sliceAngle = (d.value / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
    ctx.fillStyle = d.color;
    ctx.fill();
    startAngle += sliceAngle;
  }

  ctx.beginPath();
  ctx.arc(cx, cy, holeRadius, 0, 2 * Math.PI);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  return canvas.toDataURL('image/png');
}

/**
 * Draws the branded header on the current page.
 * Returns the Y position after the header so content can start below it.
 */
async function drawBrandedHeader(
  doc: jsPDF,
  org: OrgBranding,
  reportTitle: string,
  logoBase64?: string | null,
): Promise<number> {
  const pageWidth = doc.internal.pageSize.getWidth();
  const headerHeight = 42;

  // Background banner - custom curved bottom right
  doc.setFillColor(...PDF_BRAND.primary);
  
  // We can't easily do a complex bezier curve without advanced paths,
  // but we can draw a rectangle and then a curved shape or just use a standard rounded rectangle.
  // Actually, jsPDF supports lines and bezier curves using the `lines` method or just advanced paths.
  // Let's use a simpler approach: draw a full rectangle, then draw a white ellipse to "cut out" the curve,
  // but that's messy. Let's just use a normal rectangle and maybe a small arc or just stick to a rectangle 
  // that looks good, or use jsPDF's advanced API if needed.
  // For now, let's draw a normal rectangle, as approximating the exact curve might be tricky.
  // Wait, doc.roundedRect(x, y, w, h, rx, ry, style) can round all corners.
  
  doc.rect(0, 0, pageWidth, headerHeight, 'F');
  
  // To simulate the curved bottom right, we can draw a large white circle at the bottom right.
  // Actually, let's just stick to a clean rectangular header or a simple rounded rect.
  // The screenshot shows a curve on the bottom right.
  doc.setFillColor(255, 255, 255);
  doc.ellipse(pageWidth + 20, headerHeight + 5, 40, 15, 'F');

  let logoWidth = 0;
  const logoX = 14;
  const logoY = 8;
  const logoH = 24;

  // Draw organization logo if available
  if (logoBase64) {
    try {
      logoWidth = 24;
      doc.addImage(logoBase64, 'AUTO', logoX, logoY, logoWidth, logoH, undefined, 'FAST');
    } catch {
      logoWidth = 0;
    }
  }

  const textX = logoWidth > 0 ? logoX + logoWidth + 6 : logoX;

  // Organization name (only draw if no logo, otherwise it looks awkward next to branded logos)
  if (logoWidth === 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);    
    doc.setTextColor(...PDF_BRAND.white);
    doc.text(org.name, textX, 16);
  }

  // Report title (exactly centered)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...PDF_BRAND.white);
  const titleWidth = doc.getTextWidth(reportTitle);
  const titleX = (pageWidth - titleWidth) / 2;
  doc.text(reportTitle, titleX, 16);

  // Subtitle/Team Report (exactly centered)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...PDF_BRAND.white);
  const subtitle = "Team Report";
  const subtitleWidth = doc.getTextWidth(subtitle);
  const subtitleX = (pageWidth - subtitleWidth) / 2;
  doc.text(subtitle, subtitleX, 24);

  // Generated date (top right)
  const nowStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(230, 230, 230);
  const dateStr = `Generated: ${nowStr}`;
  const dateWidth = doc.getTextWidth(dateStr);
  doc.text(dateStr, pageWidth - 14 - dateWidth, 16);

  return headerHeight + 8; // Y position after header
}

/**
 * Draws a footer with page number and branding on the current page.
 */
function drawFooter(doc: jsPDF, orgName: string, pageNum: number, totalPages: number) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const footerY = pageHeight - 12;

  // Footer separator
  doc.setDrawColor(...PDF_BRAND.border);
  doc.setLineWidth(0.5);
  doc.line(14, footerY - 4, pageWidth - 14, footerY - 4);

  // Org name left
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...PDF_BRAND.gray);
  doc.text(orgName, 14, footerY);

  // Confidential center
  doc.setFont('helvetica', 'italic');
  const confText = 'Confidential';
  const confWidth = doc.getTextWidth(confText);
  doc.text(confText, (pageWidth - confWidth) / 2, footerY);

  // Page number right
  doc.setFont('helvetica', 'normal');
  const pageText = `Page ${pageNum} of ${totalPages}`;
  const pageTextWidth = doc.getTextWidth(pageText);
  doc.text(pageText, pageWidth - 14 - pageTextWidth, footerY);
}

/**
 * Draws a section heading with a colored accent bar.
 */
export function drawSectionHeading(
  doc: jsPDF,
  title: string,
  y: number,
  color: [number, number, number] = PDF_BRAND.primary,
): number {
  // Accent bar
  doc.setFillColor(...color);
  doc.rect(14, y, 1.5, 6, 'F');

  // Title text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text(title, 18, y + 5);

  return y + 10; // Return Y position after section heading
}

export interface MetricItem {
  value: string | number;
  label: string;
  color: [number, number, number];
  iconBase64?: string | null;
}

/**
 * Draws the Executive Summary section.
 */
export function drawExecutiveSummary(
  doc: jsPDF,
  y: number,
  graphImageBase64?: string | null,
  infoIconBase64?: string | null
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Draw rounded rectangle for summary
  doc.setFillColor(245, 245, 250); // Light purple/gray
  doc.roundedRect(14, y, pageWidth / 2 - 14, 30, 3, 3, 'F');

  // "i" icon circle
  if (infoIconBase64) {
    try {
      doc.addImage(infoIconBase64, 'PNG', 17.5, y + 5.5, 5, 5, undefined, 'FAST');
    } catch {
      // Fallback
      doc.setDrawColor(...PDF_BRAND.primary);
      doc.setLineWidth(0.5);
      doc.circle(20, y + 8, 2.5);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(...PDF_BRAND.primary);
      doc.text('i', 19.5, y + 9);
    }
  } else {
    // Fallback
    doc.setDrawColor(...PDF_BRAND.primary);
    doc.setLineWidth(0.5);
    doc.circle(20, y + 8, 2.5);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(...PDF_BRAND.primary);
    doc.text('i', 19.5, y + 9);
  }

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text('Executive Summary', 26, y + 9.5);

  // Summary Text
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...PDF_BRAND.gray);
  const text = 'This report provides an overview of key sales metrics and lead pipeline performance for the selected time period.';
  const splitText = doc.splitTextToSize(text, pageWidth / 2 - 30);
  doc.text(splitText, 18, y + 16);

  // Graph Image
  if (graphImageBase64) {
    try {
      doc.addImage(graphImageBase64, 'PNG', pageWidth / 2 + 10, y, 70, 30, undefined, 'FAST');
    } catch (e) {
      console.error(e);
    }
  }

  return y + 40;
}

/**
 * Draws Key Metrics circles.
 */
export function drawKeyMetrics(
  doc: jsPDF,
  y: number,
  metrics: MetricItem[]
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const spacing = (pageWidth - 28) / metrics.length;
  const startX = 14 + spacing / 2; // Center the block

  metrics.forEach((metric, index) => {
    const x = startX + index * spacing;
    
    // Circle
    doc.setFillColor(...metric.color);
    doc.circle(x - 15, y + 6, 5.5, 'F');
    
    // Icon
    if (metric.iconBase64) {
      try {
        doc.addImage(metric.iconBase64, 'PNG', x - 17.75, y + 3.25, 5.5, 5.5, undefined, 'FAST');
      } catch {
        // Fallback
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        doc.text('#', x - 16, y + 7.5);
      }
    } else {
      // Inside circle (icon placeholder)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text('#', x - 16, y + 7.5);
    }

    // Value (Right of circle)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(String(metric.value), x - 4, y + 4);

    // Label (Below value, properly wrapped)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...PDF_BRAND.gray);
    const labelLines = doc.splitTextToSize(metric.label, 30);
    doc.text(labelLines, x - 4, y + 9);
  });

  return y + 22;
}

export interface ReportOptions {
  org: OrgBranding;
  title: string;
  subtitle?: string;
  /** Additional info line shown under the header (e.g. "Timeframe: Jan – Jun 2025") */
  infoLine?: string;
}

/**
 * Creates a new jsPDF document with the branded header pre-drawn.
 * Returns the doc and the starting Y position for content.
 */
export async function createBrandedReport(options: ReportOptions): Promise<{
  doc: jsPDF;
  startY: number;
  logoBase64: string | null;
}> {
  const { org, title, infoLine } = options;

  // Load logo once
  const logoBase64 = org.logoUrl ? await loadImageAsBase64(org.logoUrl) : null;

  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

  const startY = await drawBrandedHeader(doc, org, title, logoBase64);

  // Info line (date filter, etc.)
  if (infoLine) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...PDF_BRAND.gray);
    doc.text(infoLine, 14, startY);
    return { doc, startY: startY + 8, logoBase64 };
  }

  return { doc, startY, logoBase64 };
}

/**
 * Finalizes the report by drawing footers on all pages.
 * Call this AFTER all content has been added.
 */
export function finalizeReport(doc: jsPDF, orgName: string): void {
  const totalPages = (doc as unknown as { internal: { getNumberOfPages: () => number } })
    .internal.getNumberOfPages();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(doc, orgName, i, totalPages);
  }
}

/**
 * When adding a new page, re-draws a compact header and returns the new content Y.
 */
export async function addBrandedPage(
  doc: jsPDF,
  org: OrgBranding,
  title: string,
  logoBase64: string | null,
): Promise<number> {
  doc.addPage();
  return drawBrandedHeader(doc, org, title, logoBase64);
}
