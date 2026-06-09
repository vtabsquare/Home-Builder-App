/**
 * Generates a professional PDF estimate for GBTI Home Builder
 * Includes configuration summary, cost breakdown, and elevation images.
 */
import jsPDF from 'jspdf';
import type { CostBreakdown } from '@/lib/cost';
import type { ConfigState } from '@/store/configurator';
import { formatMoney } from '@/lib/cost';

const GBTI_GOLD = [184, 149, 106] as const;
const INK = [17, 24, 39] as const;
const MUTED = [107, 114, 128] as const;
const LIGHT_BG = [250, 248, 245] as const;
const BORDER = [229, 231, 235] as const;

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function drawHRule(doc: jsPDF, y: number, margin: number, width: number, color = BORDER) {
  doc.setDrawColor(...color);
  doc.setLineWidth(0.3);
  doc.line(margin, y, margin + width, y);
}

function drawRoundRect(doc: jsPDF, x: number, y: number, w: number, h: number, r: number, fillColor: readonly [number, number, number], strokeColor?: readonly [number, number, number]) {
  doc.setFillColor(...fillColor);
  if (strokeColor) {
    doc.setDrawColor(...strokeColor);
    doc.setLineWidth(0.4);
    doc.roundedRect(x, y, w, h, r, r, 'FD');
  } else {
    doc.roundedRect(x, y, w, h, r, r, 'F');
  }
}

async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export interface PDFGenerationParams {
  cost: CostBreakdown;
  c: Pick<ConfigState, 'name' | 'homeType' | 'bedrooms' | 'bathrooms' | 'kitchen' | 'finishingQuality' | 'isDoubleStorey' | 'addons' | 'land' | 'landSize' | 'customLandArea' | 'roof' | 'material'>;
  loanAmount: number;
  downPayment: number;
  monthlyEMI: number;
  interestRate: number;
  tenureYears: number;
  elevationImageUrl?: string;
  floorPlanDataUrl?: string;
  leadId: string;
}

export async function generateEstimatePDF(params: PDFGenerationParams): Promise<Blob> {
  const { cost, c, loanAmount, downPayment, monthlyEMI, interestRate, tenureYears, elevationImageUrl, floorPlanDataUrl, leadId } = params;

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const PAGE_W = 210;
  const PAGE_H = 297;
  const MARGIN = 16;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  let y = 0;

  // ── COVER HEADER ─────────────────────────────────────────────────────
  drawRoundRect(doc, 0, 0, PAGE_W, 52, 0, INK);

  // Logo text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('GBTI', MARGIN, 22);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GBTI_GOLD);
  doc.text('ARCHITECTURAL CONFIGURATOR', MARGIN, 28);

  // Reference ID top right
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255, 0.5 as any);
  doc.text(`Ref: ${leadId.slice(0, 8).toUpperCase()}`, PAGE_W - MARGIN, 22, { align: 'right' });

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.setFontSize(7);
  doc.text(today, PAGE_W - MARGIN, 28, { align: 'right' });

  // Hero text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Your Home Estimate', MARGIN, 42);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GBTI_GOLD);
  doc.text('Personalised for ' + c.name, MARGIN, 48);

  y = 60;

  // ── PRICE SUMMARY CARDS ───────────────────────────────────────────────
  const cardW = (CONTENT_W - 6) / 4;
  const cards = [
    { label: 'Est. Property Price', value: formatMoney(cost.total) },
    { label: 'Loan Amount', value: formatMoney(loanAmount) },
    { label: 'Down Payment', value: formatMoney(downPayment) },
    { label: 'Monthly Repayment', value: formatMoney(monthlyEMI) },
  ];

  cards.forEach((card, i) => {
    const cx = MARGIN + i * (cardW + 2);
    drawRoundRect(doc, cx, y, cardW, 24, 3, LIGHT_BG, BORDER);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...MUTED);
    doc.text(card.label.toUpperCase(), cx + 4, y + 7);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...INK);
    doc.text(card.value, cx + 4, y + 17);
  });

  y += 30;

  // Loan terms line
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...MUTED);
  doc.text(`${tenureYears} Years @ ${interestRate.toFixed(2)}% p.a. · Non-loan eligible items (Solar, Water Tank, Generator) excluded from loan base`, MARGIN, y);
  y += 10;

  // ── IMAGES ROW ────────────────────────────────────────────────────────
  const elevImgB64 = elevationImageUrl ? await loadImageAsBase64(elevationImageUrl) : null;
  const planImgB64 = floorPlanDataUrl || null;

  const imgH = 58;
  const imgW = (CONTENT_W - 4) / 2;

  if (elevImgB64 || planImgB64) {
    if (elevImgB64) {
      drawRoundRect(doc, MARGIN, y, imgW, imgH, 3, [245, 244, 242]);
      try {
        doc.addImage(elevImgB64, 'JPEG', MARGIN, y, imgW, imgH, undefined, 'FAST');
      } catch { /* skip if image fails */ }
      doc.setFontSize(6);
      doc.setTextColor(...MUTED);
      doc.text('ELEVATION VIEW', MARGIN + 3, y + imgH - 3);
    }
    if (planImgB64) {
      drawRoundRect(doc, MARGIN + imgW + 4, y, imgW, imgH, 3, [245, 244, 242]);
      try {
        doc.addImage(planImgB64, 'JPEG', MARGIN + imgW + 4, y, imgW, imgH, undefined, 'FAST');
      } catch { /* skip if image fails */ }
      doc.setFontSize(6);
      doc.setTextColor(...MUTED);
      doc.text('FLOOR PLAN', MARGIN + imgW + 7, y + imgH - 3);
    }
    y += imgH + 8;
  }

  // ── TWO COLUMN LAYOUT ─────────────────────────────────────────────────
  const colW = (CONTENT_W - 6) / 2;
  const col1X = MARGIN;
  const col2X = MARGIN + colW + 6;
  const colStartY = y;

  // ── LEFT: Configuration ───────────────────────────────────────────────
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...INK);
  doc.text('CONFIGURATION', col1X, y);
  y += 5;
  drawHRule(doc, y, col1X, colW, GBTI_GOLD);
  y += 5;

  const HOME_TYPE_LABELS: Record<string, string> = {
    starter: 'Starter Home',
    family: 'Family Home',
    premium: 'Executive Home',
    turnkey: 'Turnkey Package',
    young_professional: 'Young Professional',
  };

  const ADDON_LABELS: Record<string, string> = {
    solar: 'Solar Panels',
    carport: 'Carport',
    water_tank: 'Water Tank',
    smart_home: 'Generator',
    fence: 'Perimeter Fence/Bridge',
    landscaping: 'Furniture',
  };

  const landText = c.land === 'need'
    ? c.landSize === 'custom' ? `Need land · ${c.customLandArea} sqft` : `Need land · ${c.landSize}`
    : c.land === 'own' ? 'Already own land' : '—';

  const configRows = [
    ['Home Type', HOME_TYPE_LABELS[c.homeType] || c.homeType],
    ['Finish Quality', c.finishingQuality === 'premium' ? 'Premium' : 'Standard'],
    ['Storeys', c.isDoubleStorey ? 'Multi-Storey' : 'Bungalow'],
    ['Bedrooms', String(c.bedrooms)],
    ['Bathrooms', String(c.bathrooms)],
    ['Kitchen', c.kitchen === 'open' ? 'Open Plan' : c.kitchen === 'galley' ? 'Galley' : 'Standard'],
    ['Roof', c.roof],
    ['Material', c.material],
    ['Land', landText],
    ['Area', `${cost.area} sqft`],
    ['Add-ons', c.addons.length ? c.addons.map(a => ADDON_LABELS[a] || a).join(', ') : 'None'],
  ];

  let leftY = y;
  configRows.forEach(([label, value]) => {
    if (leftY > PAGE_H - 30) return;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUTED);
    doc.text(label, col1X, leftY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...INK);
    const lines = doc.splitTextToSize(value, colW - 30);
    doc.text(lines, col1X + colW - 2, leftY, { align: 'right' });
    leftY += 8;
  });

  // ── RIGHT: Cost Breakdown ─────────────────────────────────────────────
  let rightY = colStartY;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...INK);
  doc.text('COST BREAKDOWN', col2X, rightY);
  rightY += 5;
  drawHRule(doc, rightY, col2X, colW, GBTI_GOLD);
  rightY += 5;

  cost.items.forEach((item) => {
    if (rightY > PAGE_H - 30) return;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUTED);
    const labelLines = doc.splitTextToSize(item.label, colW - 28);
    doc.text(labelLines, col2X, rightY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...INK);
    doc.text(formatMoney(item.amount), col2X + colW, rightY, { align: 'right' });
    rightY += 8;
  });

  // Total row
  rightY += 2;
  drawHRule(doc, rightY, col2X, colW, INK);
  rightY += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...INK);
  doc.text('TOTAL ESTIMATE', col2X, rightY);
  doc.setTextColor(...GBTI_GOLD);
  doc.text(formatMoney(cost.total), col2X + colW, rightY, { align: 'right' });

  // ── FOOTER ────────────────────────────────────────────────────────────
  const footerY = PAGE_H - 22;
  drawRoundRect(doc, 0, footerY, PAGE_W, 22, 0, INK);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...GBTI_GOLD);
  doc.text('Ready to proceed?', MARGIN, footerY + 8);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.text('Start your formal loan application at gbtibank.com/apply-for-a-loan', MARGIN, footerY + 14);

  doc.setTextColor(...MUTED);
  doc.setFontSize(6);
  doc.text('+592 231 4400  ·  GBTI Architectural Team', PAGE_W - MARGIN, footerY + 14, { align: 'right' });

  doc.setFontSize(5.5);
  doc.setTextColor(100, 100, 100);
  doc.text(
    'Estimates are indicative and subject to change. Final pricing confirmed by your architect. Consult a financial advisor before committing.',
    PAGE_W / 2, footerY + 19, { align: 'center', maxWidth: CONTENT_W }
  );

  return doc.output('blob');
}
