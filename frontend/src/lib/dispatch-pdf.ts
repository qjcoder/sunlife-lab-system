import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface DispatchDetailsForPdf {
  dispatchNumber: string;
  dealer: string;
  dispatchDate: string;
  remarks?: string;
  serialNumbers: string[];
}

/**
 * Generate a PDF of dispatch details (complete details).
 * @param openForPrint - If true, opens PDF in new window for printing; if false and alsoOpenForPrint, downloads and opens for print.
 * @param alsoOpenForPrint - If true when downloading, also opens PDF in new tab for printing.
 */
export function downloadDispatchPdf(details: DispatchDetailsForPdf, openForPrint?: boolean, alsoOpenForPrint?: boolean): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.getPageWidth();
  const margin = 14;
  let y = 14;

  // Title (left)
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Dispatch Details', margin, y, { align: 'left' });
  y += 6;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleString()}`, margin, y, { align: 'left' });
  y += 8;

  // Summary / header info table
  const summaryData: [string, string][] = [
    ['Dispatch Number', details.dispatchNumber || '—'],
    ['Dealer', details.dealer || '—'],
    ['Dispatch Date', details.dispatchDate || '—'],
    ['Remarks', (details.remarks && details.remarks.trim()) ? details.remarks.trim() : '—'],
    ['Total Units', String(details.serialNumbers?.length ?? 0)],
  ];

  autoTable(doc, {
    head: [['Field', 'Value']],
    body: summaryData,
    startY: y,
    theme: 'grid',
    styles: { fontSize: 10, halign: 'left' },
    headStyles: { fillColor: [66, 66, 66], fontSize: 10, halign: 'left' },
    columnStyles: { 0: { cellWidth: 45, fontStyle: 'bold', halign: 'left' }, 1: { cellWidth: pageWidth - margin * 2 - 45, halign: 'left' } },
    margin: { left: margin, right: margin },
    tableWidth: pageWidth - margin * 2,
  });

  const summaryTbl = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
  y = (summaryTbl?.finalY ?? y) + 6;

  // Serial numbers table (sorted lowest to highest)
  if (details.serialNumbers && details.serialNumbers.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Serial Numbers', margin, y, { align: 'left' });
    y += 5;

    const sortedSerials = [...details.serialNumbers].sort((a, b) =>
      (a || '').localeCompare(b || '', undefined, { numeric: true })
    );
    const serialRows = sortedSerials.map((serial, index) => [
      String(index + 1),
      serial,
    ]);

    autoTable(doc, {
      head: [['#', 'Serial Number']],
      body: serialRows,
      startY: y,
      theme: 'grid',
      styles: { fontSize: 9, halign: 'left' },
      headStyles: { fillColor: [66, 66, 66], fontSize: 9, halign: 'left' },
      columnStyles: {
        0: { cellWidth: 15, halign: 'left' },
        1: { cellWidth: pageWidth - margin * 2 - 15, halign: 'left' },
      },
      margin: { left: margin, right: margin },
      tableWidth: pageWidth - margin * 2,
      rowPageBreak: 'avoid',
      showHead: 'everyPage',
    });
  }

  const safeNumber = (details.dispatchNumber || 'draft').replace(/\W/g, '-').slice(0, 30);
  const filename = `dispatch-${safeNumber}-${details.dispatchDate || new Date().toISOString().slice(0, 10)}.pdf`;

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
