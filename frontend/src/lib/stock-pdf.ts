import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getModelDisplayName, getVariantDisplay, extractPowerRating } from '@/lib/utils';

type ModelStats = {
  totalRegistered: number;
  inFactory: number;
  toDealer: number;
  toSubDealer: number;
  notYetSold: number;
  sold: number;
  model: { _id: string; [key: string]: unknown };
};

type CategoryRow = {
  key: string;
  title: string;
  models: Array<{ _id: string; [key: string]: unknown }>;
};

/**
 * Generate a PDF of factory stock detail by category.
 * @param openForPrint - If true, opens PDF in new window for printing; if false and alsoOpenForPrint, downloads and opens for print.
 * @param alsoOpenForPrint - If true when downloading, also opens PDF in new tab for printing.
 */
const margin = 14;

/** Sort models by power (low to high) then by display name. */
function sortModelsAscending(models: Array<{ _id: string; [key: string]: unknown }>): Array<{ _id: string; [key: string]: unknown }> {
  return [...models].sort((a, b) => {
    const pa = extractPowerRating(a);
    const pb = extractPowerRating(b);
    if (pa !== pb) return pa - pb;
    return getModelDisplayName(a).localeCompare(getModelDisplayName(b), undefined, { numeric: true });
  });
}

export function downloadStockPdf(
  modelsByCategory: CategoryRow[],
  modelStatistics: Record<string, ModelStats>,
  openForPrint?: boolean,
  alsoOpenForPrint?: boolean
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.getPageWidth();
  let y = 14;

  // Compute summary totals from all models in categories
  let totalUnits = 0;
  let totalSold = 0;
  let totalWithDealer = 0;
  let totalWithSubDealer = 0;
  let totalInFactory = 0;
  let totalNotSold = 0;
  for (const { models } of modelsByCategory) {
    for (const model of models) {
      const stats = modelStatistics[model._id];
      if (!stats) continue;
      totalUnits += stats.totalRegistered;
      totalSold += stats.sold;
      totalWithDealer += stats.toDealer;
      totalWithSubDealer += stats.toSubDealer;
      totalInFactory += stats.inFactory;
      totalNotSold += stats.notYetSold;
    }
  }

  // Title (left)
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Factory Stock Detail', margin, y, { align: 'left' });
  y += 6;

  // Date (left)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleString()}`, margin, y, { align: 'left' });
  y += 6;

  // Summary table (left-aligned, minor spacing)
  const summaryTableWidth = 50;
  const summaryData = [
    ['Total Units', String(totalUnits)],
    ['In Factory', String(totalInFactory)],
    ['With Dealer', String(totalWithDealer)],
    ['With Sub-Dealer', String(totalWithSubDealer)],
    ['Not Sold', String(totalNotSold)],
    ['Sold', String(totalSold)],
  ];
  autoTable(doc, {
    head: [['Summary', 'Count']],
    body: summaryData,
    startY: y,
    tableWidth: summaryTableWidth,
    theme: 'grid',
    styles: { fontSize: 8, halign: 'left' },
    headStyles: { fillColor: [66, 66, 66], fontSize: 8, halign: 'left' },
    columnStyles: { 0: { cellWidth: 32 }, 1: { cellWidth: 18 } },
    margin: { left: margin, right: 14 },
  });

  const summaryTbl = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
  y = (summaryTbl?.finalY ?? y) + 6;

  const tableHead = [
    'Model',
    'Variant',
    'Total Reg.',
    'In Factory',
    'To Dealer',
    'To Sub-Dlr',
    'Not Sold',
    'Sold',
  ];

  for (const { title, models } of modelsByCategory) {
    if (models.length === 0) continue;
    const sorted = sortModelsAscending(models);

    const body = sorted.map((model) => {
      const stats = modelStatistics[model._id];
      if (!stats) return null;
      return [
        getModelDisplayName(model),
        getVariantDisplay(model) || '—',
        String(stats.totalRegistered),
        String(stats.inFactory),
        String(stats.toDealer),
        String(stats.toSubDealer),
        String(stats.notYetSold),
        String(stats.sold),
      ];
    }).filter(Boolean) as string[][];

    if (body.length === 0) continue;

    // Category heading (left)
    if (y > 35) y += 4;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin, y, { align: 'left' });
    y += 5;

    autoTable(doc, {
      head: [tableHead],
      body,
      startY: y,
      theme: 'grid',
      styles: { fontSize: 8, halign: 'left' },
      headStyles: { fillColor: [66, 66, 66], fontSize: 8, halign: 'left' },
      columnStyles: {
        0: { cellWidth: 38, halign: 'left' },
        1: { cellWidth: 18, halign: 'left' },
        2: { cellWidth: 18, halign: 'left' },
        3: { cellWidth: 18, halign: 'left' },
        4: { cellWidth: 18, halign: 'left' },
        5: { cellWidth: 18, halign: 'left' },
        6: { cellWidth: 18, halign: 'left' },
        7: { cellWidth: 14, halign: 'left' },
      },
      margin: { left: margin, right: margin },
      tableWidth: pageWidth - margin * 2,
    });

    const tbl = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
    y = (tbl?.finalY ?? y) + 4;

    // New page if we're near the bottom
    if (y > 260) {
      doc.addPage();
      y = 14;
    }
  }

  const filename = `factory-stock-${new Date().toISOString().slice(0, 10)}.pdf`;
  if (openForPrint) {
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } else if (alsoOpenForPrint) {
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } else {
    doc.save(filename);
  }
}
