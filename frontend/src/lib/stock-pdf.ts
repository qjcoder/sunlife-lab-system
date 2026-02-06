import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getModelDisplayName, getVariantDisplay } from '@/lib/utils';

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
 * Generate and download a PDF of factory stock detail by category.
 */
export function downloadStockPdf(
  modelsByCategory: CategoryRow[],
  modelStatistics: Record<string, ModelStats>
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.getPageWidth();
  const centerX = pageWidth / 2;
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

  // Title (centered)
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Factory Stock Detail', centerX, y, { align: 'center' });
  y += 8;

  // Date (centered) and Summary table on the right
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleString()}`, centerX, y, { align: 'center' });

  // Summary table at right side of top heading (position via margin.left)
  const summaryTableWidth = 50;
  const summaryLeft = pageWidth - 14 - summaryTableWidth;
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
    startY: 12,
    tableWidth: summaryTableWidth,
    theme: 'grid',
    styles: { fontSize: 8, halign: 'center' },
    headStyles: { fillColor: [66, 66, 66], fontSize: 8, halign: 'center' },
    columnStyles: { 0: { cellWidth: 32 }, 1: { cellWidth: 18 } },
    margin: { left: summaryLeft, right: 14, top: 12, bottom: 5 },
  });

  const summaryTbl = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
  y = Math.max(32, (summaryTbl?.finalY ?? 32) + 4);

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

    const body = models.map((model) => {
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

    // Category heading (centered)
    if (y > 35) {
      y += 6;
    }
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(title, centerX, y, { align: 'center' });
    y += 6;

    autoTable(doc, {
      head: [tableHead],
      body,
      startY: y,
      theme: 'grid',
      styles: { fontSize: 8, halign: 'center' },
      headStyles: { fillColor: [66, 66, 66], fontSize: 8, halign: 'center' },
      columnStyles: {
        0: { cellWidth: 38, halign: 'center' },
        1: { cellWidth: 18, halign: 'center' },
        2: { cellWidth: 18, halign: 'center' },
        3: { cellWidth: 18, halign: 'center' },
        4: { cellWidth: 18, halign: 'center' },
        5: { cellWidth: 18, halign: 'center' },
        6: { cellWidth: 18, halign: 'center' },
        7: { cellWidth: 14, halign: 'center' },
      },
      margin: { left: 14, right: 14 },
      tableWidth: pageWidth - 28,
    });

    const tbl = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
    y = (tbl?.finalY ?? y) + 4;

    // New page if we're near the bottom
    if (y > 260) {
      doc.addPage();
      y = 14;
    }
  }

  doc.save(`factory-stock-${new Date().toISOString().slice(0, 10)}.pdf`);
}
