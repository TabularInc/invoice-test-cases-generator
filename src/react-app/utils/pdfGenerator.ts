import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice } from '../../shared/types';
import JSZip from 'jszip';

export function generateInvoicePDF(invoice: Invoice): Blob {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;

  // Determine if this is a receivable (we issued it) or payable (we received it)
  const isReceivable = invoice.direction === 'receivables';

  // Colors - different accent for receivables vs payables
  const primaryColor: [number, number, number] = isReceivable ? [22, 101, 52] : [41, 65, 114]; // Green for receivables, blue for payables
  const accentColor: [number, number, number] = isReceivable ? [34, 197, 94] : [59, 130, 246];
  const textColor: [number, number, number] = [55, 65, 81];
  const lightGray: [number, number, number] = [156, 163, 175];

  // Header background
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 40, 'F');

  // Company name (supplier - the one issuing the invoice)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(invoice.supplier.name, margin, 22);

  // Invoice type label and number - different for receivables vs payables
  const invoiceTypeLabel = isReceivable ? 'SALES INVOICE' : 'VENDOR INVOICE';
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(invoiceTypeLabel, pageWidth - margin, 16, { align: 'right' });
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(invoice.number, pageWidth - margin, 28, { align: 'right' });

  // Supplier details (left side) - the company issuing the invoice
  let y = 52;
  doc.setTextColor(...textColor);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  // For receivables: "ISSUED BY" (we issued it), for payables: "VENDOR" (they issued it to us)
  doc.text(isReceivable ? 'ISSUED BY' : 'VENDOR', margin, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(invoice.supplier.name, margin, y);
  y += 4;
  const supplierAddressLines = invoice.supplier.address.split(', ');
  for (const line of supplierAddressLines) {
    doc.text(line, margin, y);
    y += 4;
  }
  doc.text(`Phone: ${invoice.supplier.phone}`, margin, y);
  y += 4;
  doc.text(`Email: ${invoice.supplier.email}`, margin, y);
  y += 4;
  doc.text(`VAT ID: ${invoice.supplier.vatId}`, margin, y);

  // Customer details (right side) - the company receiving the invoice
  y = 52;
  const rightX = pageWidth / 2 + 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  // For receivables: "BILL TO" (our customer), for payables: "BILLED TO" (us)
  doc.text(isReceivable ? 'BILL TO' : 'BILLED TO', rightX, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.customer.name, rightX, y);
  y += 4;
  const customerAddressLines = invoice.customer.address.split(', ');
  for (const line of customerAddressLines) {
    doc.text(line, rightX, y);
    y += 4;
  }
  doc.text(`Phone: ${invoice.customer.phone}`, rightX, y);
  y += 4;
  doc.text(`Email: ${invoice.customer.email}`, rightX, y);

  // Invoice details box
  y = 100;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 20, 2, 2, 'F');

  y += 8;
  doc.setFontSize(7);
  doc.setTextColor(...lightGray);
  doc.text('Invoice Date', margin + 8, y);
  doc.text('Due Date', margin + 50, y);
  doc.text('Currency', margin + 92, y);
  doc.text('Status', pageWidth - margin - 25, y);

  y += 6;
  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(invoice.date, margin + 8, y);
  doc.text(invoice.dueDate, margin + 50, y);
  doc.text(invoice.currency, margin + 92, y);

  // Status badge - different for receivables (RECEIVABLE) vs payables (PAYABLE)
  const statusLabel = isReceivable ? 'RECEIVABLE' : 'PAYABLE';
  const badgeWidth = isReceivable ? 32 : 28;
  doc.setFillColor(...accentColor);
  doc.roundedRect(pageWidth - margin - badgeWidth - 4, y - 5, badgeWidth, 8, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(6);
  doc.text(statusLabel, pageWidth - margin - badgeWidth / 2 - 4, y, { align: 'center' });

  // Items table
  y += 15;

  const tableHead = [['Description', 'Qty', 'Unit Price', 'Tax', 'Amount']];
  const tableBody = invoice.items.map((item) => {
    const amount = (item.quantity * item.price).toFixed(2);
    return [
      item.name,
      item.quantity.toString(),
      `€${item.price.toFixed(2)}`,
      `${item.tax}%`,
      `€${amount}`,
    ];
  });

  autoTable(doc, {
    startY: y,
    head: tableHead,
    body: tableBody,
    theme: 'plain',
    styles: {
      fontSize: 8,
      cellPadding: 4,
      textColor: textColor,
    },
    headStyles: {
      fillColor: [248, 250, 252],
      textColor: primaryColor,
      fontStyle: 'bold',
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 18 },
      2: { halign: 'right', cellWidth: 28 },
      3: { halign: 'center', cellWidth: 18 },
      4: { halign: 'right', cellWidth: 28 },
    },
    margin: { left: margin, right: margin },
  });

  // Get the table end position
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lastTableY = (doc as any).lastAutoTable?.finalY || y + 40;
  y = lastTableY + 10;

  // Totals section (right aligned)
  const totalsX = pageWidth - margin - 70;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...textColor);

  // Subtotal
  doc.text('Subtotal:', totalsX, y);
  doc.text(`€${invoice.subtotal.toFixed(2)}`, pageWidth - margin, y, { align: 'right' });

  // Tax
  y += 6;
  doc.text('Tax:', totalsX, y);
  doc.text(`€${invoice.taxTotal.toFixed(2)}`, pageWidth - margin, y, { align: 'right' });

  // Divider
  y += 4;
  doc.setDrawColor(...lightGray);
  doc.line(totalsX, y, pageWidth - margin, y);

  // Total
  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...primaryColor);
  doc.text('Total:', totalsX, y);
  doc.text(`€${invoice.total.toFixed(2)}`, pageWidth - margin, y, { align: 'right' });

  // Bank details and Note section - positioned with enough space from footer
  const bankDetailsY = Math.min(y + 20, pageHeight - 65);

  // Bank details box - different label for receivables vs payables
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, bankDetailsY, 85, 28, 2, 2, 'F');

  doc.setFontSize(8);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  // For receivables: "Payment Details" (where customer should pay), for payables: "Vendor Bank Details"
  doc.text(isReceivable ? 'Payment Details' : 'Vendor Bank Details', margin + 6, bankDetailsY + 8);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textColor);
  doc.setFontSize(7);
  doc.text(`Bank: ${invoice.supplier.bankName}`, margin + 6, bankDetailsY + 15);
  doc.text(`IBAN: ${invoice.supplier.iban}`, margin + 6, bankDetailsY + 21);

  // Note (next to bank details)
  if (invoice.note) {
    doc.setFontSize(7);
    doc.setTextColor(...lightGray);
    doc.setFont('helvetica', 'italic');
    const noteLines = doc.splitTextToSize(invoice.note, 75);
    doc.text(noteLines, margin + 95, bankDetailsY + 8);
  }

  // Footer - fixed at bottom
  const footerY = pageHeight - 12;
  doc.setDrawColor(230, 230, 230);
  doc.line(margin, footerY - 6, pageWidth - margin, footerY - 6);
  doc.setFontSize(7);
  doc.setTextColor(...lightGray);
  doc.text(
    `${invoice.supplier.website} | ${invoice.supplier.email}`,
    pageWidth / 2,
    footerY,
    { align: 'center' }
  );

  return doc.output('blob');
}

export async function generateAllInvoicesZip(invoices: Invoice[]): Promise<Blob> {
  const zip = new JSZip();
  const invoicesFolder = zip.folder('invoices');

  for (const invoice of invoices) {
    const pdfBlob = generateInvoicePDF(invoice);
    const fileName = `${invoice.number.replace(/[^a-zA-Z0-9-]/g, '_')}.pdf`;
    invoicesFolder?.file(fileName, pdfBlob);
  }

  return await zip.generateAsync({ type: 'blob' });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename);
}

export function downloadJSON(data: unknown, filename: string): void {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  downloadBlob(blob, filename);
}
