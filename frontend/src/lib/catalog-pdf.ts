import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getModelDisplayName, getVariantDisplay, categorizeModel, extractPowerRating } from '@/lib/utils';

type ModelRecord = {
  _id: string;
  productLine?: string;
  brand?: string;
  variant?: string;
  modelCode?: string;
  [key: string]: unknown;
};

/**
 * Generate a PDF of the product catalog by category (Inverters, Batteries, VFD).
 * @param openForPrint - If true, opens PDF in new window for printing; if false and alsoOpenForPrint, downloads and opens for print.
 * @param alsoOpenForPrint - If true when downloading, also opens PDF in new tab for printing.
 */
/** Sort models by power (low to high) then by display name. */
function sortModelsAscending(list: ModelRecord[]): ModelRecord[] {
  return [...list].sort((a, b) => {
    const pa = extractPowerRating(a);
    const pb = extractPowerRating(b);
    if (pa !== pb) return pa - pb;
    return getModelDisplayName(a).localeCompare(getModelDisplayName(b), undefined, { numeric: true });
  });
}

export function downloadCatalogPdf(models: ModelRecord[], openForPrint?: boolean, alsoOpenForPrint?: boolean): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.getPageWidth();
  const margin = 14;
  let y = 14;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Product Catalog', margin, y, { align: 'left' });
  y += 6;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleString()}`, margin, y, { align: 'left' });
  y += 8;

  const inverter: ModelRecord[] = [];
  const battery: ModelRecord[] = [];
  const vfd: ModelRecord[] = [];
  (models || []).forEach((m) => {
    if (!m) return;
    const cat = categorizeModel(m);
    if (cat === 'battery') battery.push(m);
    else if (cat === 'vfd') vfd.push(m);
    else inverter.push(m);
  });

  const sections: { title: string; list: ModelRecord[] }[] = [
    { title: 'Inverters', list: sortModelsAscending(inverter) },
    { title: 'Batteries', list: sortModelsAscending(battery) },
    { title: 'VFD', list: sortModelsAscending(vfd) },
  ];

  const tableHead = ['#', 'Model', 'Variant'];

  for (const { title, list } of sections) {
    if (list.length === 0) continue;
    if (y > 35) y += 4;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin, y, { align: 'left' });
    y += 5;

    const body = list.map((model, idx) => [
      String(idx + 1),
      getModelDisplayName(model),
      getVariantDisplay(model) || '—',
    ]);

    autoTable(doc, {
      head: [tableHead],
      body,
      startY: y,
      theme: 'grid',
      styles: { fontSize: 9, halign: 'left' },
      headStyles: { fillColor: [66, 66, 66], fontSize: 9, halign: 'left' },
      columnStyles: {
        0: { cellWidth: 12, halign: 'left' },
        1: { cellWidth: 80, halign: 'left' },
        2: { cellWidth: 40, halign: 'left' },
      },
      margin: { left: margin, right: margin },
      tableWidth: pageWidth - margin * 2,
    });

    const tbl = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
    y = (tbl?.finalY ?? y) + 4;
    if (y > 260) {
      doc.addPage();
      y = 14;
    }
  }

  const filename = `product-catalog-${new Date().toISOString().slice(0, 10)}.pdf`;
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
