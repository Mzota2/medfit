/**
 * Centralized PDF export utilities
 * Manual PDF generation (screen-size independent)
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Timestamp } from 'firebase/firestore';

import { formatCurrency, formatDate, formatDateTime, formatPaymentMethod } from '@/lib/utils/formatting';
import { generateInvoiceNumber } from '@/lib/utils/invoiceUtils';
import type { User } from '@/types/user';
import type { PaymentSession } from '@/types/payment';
import type { LedgerEntry } from '@/types/ledger';
import type { Booking } from '@/types/booking';
import type { Order } from '@/types/order';
import type { business } from '@/types/business';

type TimestampLike = { toDate: () => Date };
type DateLike = Date | string | Timestamp | TimestampLike | undefined | null;

const isTimestampLike = (value: unknown): value is TimestampLike => {
  if (!value || typeof value !== 'object') return false;
  if (!('toDate' in value)) return false;
  return typeof (value as { toDate?: unknown }).toDate === 'function';
};

const toDate = (value: DateLike): Date => {
  if (!value) return new Date(0);
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value === 'string') return new Date(value);
  if (isTimestampLike(value)) return value.toDate();
  return new Date(String(value));
};

type AddressLike = {
  areaOrVillage?: string;
  traditionalAuthority?: string;
  district?: string;
  region?: string;
  country?: string;
  phone?: string;
};

const isAddressLike = (value: unknown): value is AddressLike => {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.district === 'string' ||
    typeof v.areaOrVillage === 'string' ||
    typeof v.region === 'string' ||
    typeof v.country === 'string'
  );
};

const getBookingAddress = (booking: Booking): AddressLike | undefined => {
  const b = booking as Booking & { address?: unknown; customerAddress?: unknown };
  const candidate = b.address ?? b.customerAddress;
  return isAddressLike(candidate) ? candidate : undefined;
};

const getOrderCustomerPhone = (order: Order): string | undefined => {
  const o = order as Order & { customerPhone?: unknown };
  if (typeof o.customerPhone === 'string') return o.customerPhone;
  return order.delivery?.address?.phone;
};

type JsPdfWithAutoTable = jsPDF & { lastAutoTable?: { finalY?: number } };
const getLastAutoTableFinalY = (doc: jsPDF): number | undefined => {
  return (doc as unknown as JsPdfWithAutoTable).lastAutoTable?.finalY;
};

type BrandedHeaderOptions = {
  business?: business;
  logoDataUrl?: string | null;
  documentTitle: string;
  detailLines: Array<{ label: string; value: string }>;
};

const drawBrandedHeader = (doc: jsPDF, options: BrandedHeaderOptions) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 14;

  const leftX = marginX;
  const rightX = pageWidth - marginX;

  const topY = 16;
  let leftY = topY + 6;

  if (options.logoDataUrl) {
    try {
      doc.addImage(options.logoDataUrl, 'PNG', leftX, topY - 4, 18, 18);
      leftY = topY + 12;
    } catch {
      leftY = topY + 6;
    }
  }

  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(options.business?.name || '', leftX, leftY + 10);

  const businessLines = buildBusinessLines(options.business);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(70, 70, 70);
  let businessY = leftY + 20;
  businessLines.forEach((line) => {
    doc.text(line, leftX, businessY);
    businessY += 6;
  });

  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(options.documentTitle, rightX, topY + 4, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(70, 70, 70);
  let detailsY = topY + 14;
  options.detailLines.forEach((line) => {
    const label = `${line.label}:`;
    doc.setFont('helvetica', 'bold');
    doc.text(label, rightX - 62, detailsY, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text(line.value, rightX, detailsY, { align: 'right' });
    detailsY += 6;
  });

  const bottomY = Math.max(businessY, detailsY) + 8;
  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.3);
  doc.line(marginX, bottomY, pageWidth - marginX, bottomY);

  return { marginX, startY: bottomY + 8 };
};

const drawBrandedFooter = (
  doc: jsPDF,
  options: {
    business?: business;
    footer1?: string;
  }
) => {
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;

  const footerTop = pageHeight - 18;
  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.3);
  doc.line(marginX, footerTop - 10, doc.internal.pageSize.getWidth() - marginX, footerTop - 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(110, 110, 110);

  const footer1 = options.footer1 || `Thank you for choosing ${options.business?.name || 'our business'}!`;
  const footer2 = 'This is a computer-generated document and does not require a signature.';
  const footer3 = `Generated on: ${formatDate(new Date())}`;

  const pageWidth = doc.internal.pageSize.getWidth();
  doc.text(footer1, pageWidth / 2, footerTop - 2, { align: 'center' });
  doc.text(footer2, pageWidth / 2, footerTop + 3, { align: 'center' });
  doc.text(footer3, pageWidth / 2, footerTop + 8, { align: 'center' });
};

const safeText = (value: unknown): string => {
  if (value === undefined || value === null) return '';
  return String(value);
};

const buildBusinessLines = (biz: business | undefined | null): string[] => {
  if (!biz) return [];

  const lines: string[] = [];
  if (biz.address?.areaOrVillage) lines.push(biz.address.areaOrVillage);
  if (biz.address?.traditionalAuthority) lines.push(biz.address.traditionalAuthority);
  if (biz.address?.district) lines.push(biz.address.district);

  if (biz.address?.region || biz.address?.country) {
    const region = biz.address?.region ? `${biz.address.region}` : '';
    const country = biz.address?.country || 'Malawi';
    lines.push(region ? `${region}, ${country}` : country);
  }

  if (biz.contactInfo?.phone) lines.push(`Tel: ${biz.contactInfo.phone}`);
  if (biz.contactInfo?.email) lines.push(`Email: ${biz.contactInfo.email}`);
  if (biz.tpin) lines.push(`TPIN: ${biz.tpin}`);

  return lines;
};

const loadImageAsDataUrl = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Failed to load image'));
        image.src = objectUrl;
      });

      const sizePx = 256;
      const canvas = document.createElement('canvas');
      canvas.width = sizePx;
      canvas.height = sizePx;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      const minDim = Math.min(img.width, img.height);
      const sx = (img.width - minDim) / 2;
      const sy = (img.height - minDim) / 2;
      ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, sizePx, sizePx);

      return canvas.toDataURL('image/png');
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    return null;
  }
};

const drawInvoiceHeader = async (doc: jsPDF, options: {
  business?: business;
  documentTitle: string;
  detailLines: Array<{ label: string; value: string }>;
}) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 14;

  const leftX = marginX;
  const rightX = pageWidth - marginX;

  let topY = 16;
  let leftY = topY + 6;

  if (options.business?.logo) {
    const dataUrl = await loadImageAsDataUrl(options.business.logo);
    if (dataUrl) {
      try {
        doc.addImage(dataUrl, 'PNG', leftX, topY - 4, 18, 18);
        leftY = topY + 12;
      } catch {
        leftY = topY + 6;
      }
    }
  }

  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(options.business?.name || '', leftX, leftY + 10);

  const businessLines = buildBusinessLines(options.business);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(70, 70, 70);
  let businessY = leftY + 20;
  businessLines.forEach((line) => {
    doc.text(line, leftX, businessY);
    businessY += 6;
  });

  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(options.documentTitle, rightX, topY + 4, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(70, 70, 70);
  let detailsY = topY + 14;
  options.detailLines.forEach((line) => {
    const label = `${line.label}:`;
    doc.setFont('helvetica', 'bold');
    doc.text(label, rightX - 62, detailsY, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text(line.value, rightX, detailsY, { align: 'right' });
    detailsY += 6;
  });

  const bottomY = Math.max(businessY, detailsY) + 8;
  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.3);
  doc.line(marginX, bottomY, pageWidth - marginX, bottomY);

  return { marginX, startY: bottomY + 8 };
};

export const exportInvoicePdf = async (options:
  | {
      type: 'order';
      order: Order;
      business?: business;
      invoiceNumber?: string;
      fileName: string;
    }
  | {
      type: 'booking';
      booking: Booking;
      business?: business;
      invoiceNumber?: string;
      fileName: string;
    }
): Promise<void> => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageHeight = doc.internal.pageSize.getHeight();

  const invoiceNumber = options.invoiceNumber || generateInvoiceNumber(options.business?.name || 'BUSINESS');
  const invoiceDate = formatDate(new Date());

  const documentNumber =
    options.type === 'order' ? options.order.orderNumber : options.booking.bookingNumber;
  const documentDate =
    options.type === 'order'
      ? formatDate(toDate(options.order.createdAt))
      : formatDate(toDate(options.booking.createdAt));

  const { marginX, startY } = await drawInvoiceHeader(doc, {
    business: options.business,
    documentTitle: 'INVOICE',
    detailLines: [
      { label: 'Invoice Number', value: invoiceNumber },
      { label: 'Invoice Date', value: invoiceDate },
      { label: options.type === 'order' ? 'Order Number' : 'Booking Number', value: documentNumber },
      { label: options.type === 'order' ? 'Order Date' : 'Booking Date', value: documentDate },
    ],
  });

  let y = startY;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 30, 30);
  doc.text('Bill To:', marginX, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const customerName =
    options.type === 'order'
      ? options.order.customerName || ''
      : options.booking.customerName || '';
  doc.text(customerName || 'N/A', marginX + 20, y);

  const billToLines: string[] = [];
  const email = options.type === 'order' ? options.order.customerEmail : options.booking.customerEmail;
  if (email) billToLines.push(email);

  const phone =
    options.type === 'order'
      ? getOrderCustomerPhone(options.order)
      : options.booking.customerPhone;
  if (phone) billToLines.push(phone);

  const address =
    options.type === 'order'
      ? options.order.delivery?.address
      : getBookingAddress(options.booking);

  if (address) {
    const addressLines: string[] = [];
    if (address.areaOrVillage) addressLines.push(address.areaOrVillage);
    if (address.traditionalAuthority) addressLines.push(address.traditionalAuthority);
    if (address.district) addressLines.push(address.district);
    if (address.region || address.country) {
      addressLines.push(`${safeText(address.region)}, ${safeText(address.country || 'Malawi')}`.replace(/^,\s*/, ''));
    }

    addressLines.forEach((line) => {
      if (line) billToLines.push(line);
    });
  }

  if (billToLines.length > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(70, 70, 70);
    let detailsY = y + 6;
    billToLines.forEach((line) => {
      doc.text(line, marginX + 20, detailsY);
      detailsY += 5;
    });
    y = detailsY + 4;
  } else {
    y += 10;
  }

  if (options.type === 'order') {
    const order = options.order;

    autoTable(doc, {
      startY: y,
      head: [['Description', 'Qty', 'Unit Price', 'Total']],
      body: order.items.map((item) => [
        safeText(item.productName),
        safeText(item.quantity),
        formatCurrency(item.unitPrice ?? item.subtotal / Math.max(1, item.quantity), order.pricing.currency),
        formatCurrency(item.subtotal, order.pricing.currency),
      ]),
      theme: 'grid',
      margin: { left: marginX, right: marginX },
      styles: {
        font: 'helvetica',
        fontSize: 9,
        textColor: [30, 30, 30],
        lineColor: [220, 220, 220],
        lineWidth: 0.1,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [30, 30, 30],
        fontStyle: 'bold',
      },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      columnStyles: {
        0: { cellWidth: 86 },
        1: { cellWidth: 14, halign: 'center' },
        2: { cellWidth: 35, halign: 'right' },
        3: { cellWidth: 35, halign: 'right' },
      },
    });

    const finalY = getLastAutoTableFinalY(doc) ?? y;
    y = finalY + 8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text('Pricing', marginX, y);
    y += 6;

    const pricingRows: Array<[string, string]> = [];
    pricingRows.push(['Subtotal', formatCurrency(order.pricing.subtotal, order.pricing.currency)]);
    if (typeof order.pricing.discount === 'number' && order.pricing.discount > 0) {
      pricingRows.push(['Discount', `-${formatCurrency(order.pricing.discount, order.pricing.currency)}`]);
    }
    if (typeof order.pricing.shipping === 'number' && order.pricing.shipping > 0) {
      pricingRows.push(['Shipping', formatCurrency(order.pricing.shipping, order.pricing.currency)]);
    }
    if (typeof order.pricing.tax === 'number' && order.pricing.tax > 0) {
      pricingRows.push(['Tax', formatCurrency(order.pricing.tax, order.pricing.currency)]);
    }
    pricingRows.push(['Total', formatCurrency(order.pricing.total, order.pricing.currency)]);

    autoTable(doc, {
      startY: y,
      head: [['Description', 'Amount']],
      body: pricingRows,
      theme: 'grid',
      margin: { left: marginX, right: marginX },
      styles: {
        font: 'helvetica',
        fontSize: 9,
        textColor: [30, 30, 30],
        lineColor: [220, 220, 220],
        lineWidth: 0.1,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [30, 30, 30],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 70, halign: 'right' },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.row.index === pricingRows.length - 1) {
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });

    y = (getLastAutoTableFinalY(doc) ?? y) + 6;

    if (order.delivery?.address) {
      y += 4;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 30, 30);
      doc.text('Delivery Details', marginX, y);
      y += 6;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(70, 70, 70);

      const lines: string[] = [];
      if (order.delivery.address.areaOrVillage) lines.push(order.delivery.address.areaOrVillage);
      if (order.delivery.address.traditionalAuthority) lines.push(order.delivery.address.traditionalAuthority);
      if (order.delivery.address.district) lines.push(order.delivery.address.district);
      lines.push(`${order.delivery.address.region}, ${order.delivery.address.country}`);

      lines.forEach((line) => {
        doc.text(line, marginX, y);
        y += 5;
      });
    }
  } else {
    const booking = options.booking;
    const start = booking.timeSlot?.startTime instanceof Date ? booking.timeSlot.startTime : new Date(booking.timeSlot.startTime);
    const end = booking.timeSlot?.endTime instanceof Date ? booking.timeSlot.endTime : new Date(booking.timeSlot.endTime);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text('Service Details', marginX, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [['Description', 'Value']],
      body: [
        ['Service', safeText(booking.serviceName)],
        ['Date', formatDate(start)],
        ['Time', `${formatDate(start)} - ${formatDate(end)}`],
        ['Duration', `${safeText(booking.timeSlot?.duration)} minutes`],
      ],
      theme: 'grid',
      margin: { left: marginX, right: marginX },
      styles: {
        font: 'helvetica',
        fontSize: 9,
        textColor: [30, 30, 30],
        lineColor: [220, 220, 220],
        lineWidth: 0.1,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [30, 30, 30],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 48 },
        1: { cellWidth: 122 },
      },
    });

    y = (getLastAutoTableFinalY(doc) ?? y) + 8;

    const pricingRows: Array<[string, string]> = [];
    const currency = booking.pricing.currency;

    const isPartial = Boolean(booking.pricing.isPartialPayment);
    if (isPartial) {
      pricingRows.push(['Booking Fee', formatCurrency(booking.pricing.bookingFee || 0, currency)]);
      pricingRows.push(['Tax', formatCurrency(booking.pricing.tax || 0, currency)]);
      pricingRows.push(['Amount Paid', formatCurrency(booking.pricing.total, currency)]);
      const totalFee = booking.pricing.totalFee || booking.pricing.basePrice;
      const remaining = totalFee - (booking.pricing.bookingFee || 0);
      if (remaining > 0) pricingRows.push(['Remaining Balance', formatCurrency(remaining, currency)]);
      pricingRows.push(['Total Service Fee', formatCurrency(totalFee, currency)]);
    } else {
      pricingRows.push(['Service Fee', formatCurrency(booking.pricing.basePrice, currency)]);
      if (typeof booking.pricing.tax === 'number' && booking.pricing.tax > 0) {
        pricingRows.push(['Tax', formatCurrency(booking.pricing.tax, currency)]);
      }
      pricingRows.push(['Total Paid', formatCurrency(booking.pricing.total, currency)]);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text('Pricing', marginX, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [['Description', 'Amount']],
      body: pricingRows,
      theme: 'grid',
      margin: { left: marginX, right: marginX },
      styles: {
        font: 'helvetica',
        fontSize: 9,
        textColor: [30, 30, 30],
        lineColor: [220, 220, 220],
        lineWidth: 0.1,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [30, 30, 30],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 70, halign: 'right' },
      },
    });

    y = (getLastAutoTableFinalY(doc) ?? y) + 6;
  }

  const footerTop = pageHeight - 18;
  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.3);
  doc.line(marginX, footerTop - 10, doc.internal.pageSize.getWidth() - marginX, footerTop - 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(110, 110, 110);
  const footer1 = options.type === 'order' ? 'Thank you for shopping with us! ' : 'Thank you for choosing our service!';
  const footer2 = 'This is a computer-generated invoice and does not require a signature.';
  const footer3 = `Generated on: ${formatDate(new Date())}`;
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.text(footer1, pageWidth / 2, footerTop - 2, { align: 'center' });
  doc.text(footer2, pageWidth / 2, footerTop + 3, { align: 'center' });
  doc.text(footer3, pageWidth / 2, footerTop + 8, { align: 'center' });

  doc.save(`${options.fileName}.pdf`);
};

type KpiLine = { label: string; value: string };

const addKpiTable = (doc: jsPDF, options: {
  startY: number;
  marginX: number;
  kpis: KpiLine[];
  didDrawPage: () => void;
}) => {
  autoTable(doc, {
    startY: options.startY,
    head: [['Metric', 'Value']],
    body: options.kpis.map((k) => [k.label, k.value]),
    theme: 'grid',
    margin: { left: options.marginX, right: options.marginX, top: options.startY, bottom: 24 },
    styles: {
      font: 'helvetica',
      fontSize: 9,
      textColor: [30, 30, 30],
      lineColor: [220, 220, 220],
      lineWidth: 0.1,
      cellPadding: 2.5,
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [30, 30, 30],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 100 },
    },
    didDrawPage: options.didDrawPage,
  });
};

const addSectionTitle = (doc: jsPDF, options: { title: string; x: number; y: number }) => {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text(options.title, options.x, options.y);
};

export const exportReportsPdf = async (options:
  | {
      type: 'sales';
      fileName: string;
      business?: business;
      period: { start: Date; end: Date };
      totals: {
        totalRevenue: number;
        totalOrders: number;
        totalBookings: number;
        averageOrderValue: number;
        averageBookingValue: number;
        totalTransactions: number;
        currency?: string;
      };
      ordersByStatus: Record<string, number>;
      bookingsByStatus: Record<string, number>;
    }
  | {
      type: 'products';
      fileName: string;
      business?: business;
      period: { start: Date; end: Date };
      currency?: string;
      rows: Array<{ productName: string; unitsSold: number; revenue: number; averagePrice: number }>;
    }
  | {
      type: 'services';
      fileName: string;
      business?: business;
      period: { start: Date; end: Date };
      currency?: string;
      rows: Array<{ serviceName: string; bookingsCount: number; revenue: number; averagePrice: number }>;
    }
  | {
      type: 'customers';
      fileName: string;
      business?: business;
      period: { start: Date; end: Date };
      summary: { totalCustomers: number; newCustomers: number; returningCustomers: number };
      topCustomers: Array<{ customerName: string; orderCount: number; totalSpent: number; currency?: string }>;
    }
): Promise<void> => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const logoDataUrl = options.business?.logo ? await loadImageAsDataUrl(options.business.logo) : null;

  const reportTitle =
    options.type === 'sales'
      ? 'SALES REPORT'
      : options.type === 'products'
        ? 'PRODUCT SALES REPORT'
        : options.type === 'services'
          ? 'SERVICE BOOKINGS REPORT'
          : 'CUSTOMER REPORT';

  const headerOptions: BrandedHeaderOptions = {
    business: options.business,
    logoDataUrl,
    documentTitle: reportTitle,
    detailLines: [
      { label: 'Period', value: `${formatDate(options.period.start)} - ${formatDate(options.period.end)}` },
      { label: 'Generated', value: formatDate(new Date()) },
    ],
  };

  const headerInfo = drawBrandedHeader(doc, headerOptions);
  const didDrawPage = () => {
    drawBrandedHeader(doc, headerOptions);
    drawBrandedFooter(doc, { business: options.business });
  };

  let y = headerInfo.startY;
  const marginX = headerInfo.marginX;

  if (options.type === 'sales') {
    const currency = options.totals.currency || 'MWK';
    addSectionTitle(doc, { title: 'Summary', x: marginX, y });
    y += 6;

    addKpiTable(doc, {
      startY: y,
      marginX,
      kpis: [
        { label: 'Total Revenue', value: formatCurrency(options.totals.totalRevenue, currency) },
        { label: 'Total Orders', value: `${options.totals.totalOrders}` },
        { label: 'Total Bookings', value: `${options.totals.totalBookings}` },
        { label: 'Avg Order Value', value: formatCurrency(options.totals.averageOrderValue, currency) },
        { label: 'Avg Booking Value', value: formatCurrency(options.totals.averageBookingValue, currency) },
        { label: 'Total Transactions', value: `${options.totals.totalTransactions}` },
      ],
      didDrawPage,
    });

    y = (getLastAutoTableFinalY(doc) ?? y) + 8;
    addSectionTitle(doc, { title: 'Orders by Status', x: marginX, y });
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [['Status', 'Count']],
      body: Object.entries(options.ordersByStatus).map(([status, count]) => [status, `${count}`]),
      theme: 'grid',
      margin: { left: marginX, right: marginX, top: y, bottom: 24 },
      styles: {
        font: 'helvetica',
        fontSize: 9,
        textColor: [30, 30, 30],
        lineColor: [220, 220, 220],
        lineWidth: 0.1,
        cellPadding: 2.5,
      },
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [30, 30, 30],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 110 },
        1: { cellWidth: 60, halign: 'right' },
      },
      didDrawPage,
    });

    y = (getLastAutoTableFinalY(doc) ?? y) + 8;
    addSectionTitle(doc, { title: 'Bookings by Status', x: marginX, y });
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [['Status', 'Count']],
      body: Object.entries(options.bookingsByStatus).map(([status, count]) => [status, `${count}`]),
      theme: 'grid',
      margin: { left: marginX, right: marginX, top: y, bottom: 24 },
      styles: {
        font: 'helvetica',
        fontSize: 9,
        textColor: [30, 30, 30],
        lineColor: [220, 220, 220],
        lineWidth: 0.1,
        cellPadding: 2.5,
      },
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [30, 30, 30],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 110 },
        1: { cellWidth: 60, halign: 'right' },
      },
      didDrawPage,
    });
  }

  if (options.type === 'products') {
    const currency = options.currency || 'MWK';
    addSectionTitle(doc, { title: 'Product Sales', x: marginX, y });
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [['Product', 'Units Sold', 'Revenue', 'Avg Price']],
      body: options.rows.map((r) => [
        r.productName,
        `${r.unitsSold}`,
        formatCurrency(r.revenue, currency),
        formatCurrency(r.averagePrice, currency),
      ]),
      theme: 'grid',
      margin: { left: marginX, right: marginX, top: y, bottom: 24 },
      styles: {
        font: 'helvetica',
        fontSize: 9,
        textColor: [30, 30, 30],
        lineColor: [220, 220, 220],
        lineWidth: 0.1,
        cellPadding: 2.5,
      },
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [30, 30, 30],
        fontStyle: 'bold',
      },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 25, halign: 'right' },
        2: { cellWidth: 35, halign: 'right' },
        3: { cellWidth: 30, halign: 'right' },
      },
      didDrawPage,
    });
  }

  if (options.type === 'services') {
    const currency = options.currency || 'MWK';
    addSectionTitle(doc, { title: 'Service Bookings', x: marginX, y });
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [['Service', 'Bookings', 'Revenue', 'Avg Price']],
      body: options.rows.map((r) => [
        r.serviceName,
        `${r.bookingsCount}`,
        formatCurrency(r.revenue, currency),
        formatCurrency(r.averagePrice, currency),
      ]),
      theme: 'grid',
      margin: { left: marginX, right: marginX, top: y, bottom: 24 },
      styles: {
        font: 'helvetica',
        fontSize: 9,
        textColor: [30, 30, 30],
        lineColor: [220, 220, 220],
        lineWidth: 0.1,
        cellPadding: 2.5,
      },
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [30, 30, 30],
        fontStyle: 'bold',
      },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 25, halign: 'right' },
        2: { cellWidth: 35, halign: 'right' },
        3: { cellWidth: 30, halign: 'right' },
      },
      didDrawPage,
    });
  }

  if (options.type === 'customers') {
    const currency = options.topCustomers?.[0]?.currency || 'MWK';
    addSectionTitle(doc, { title: 'Customer Summary', x: marginX, y });
    y += 6;

    addKpiTable(doc, {
      startY: y,
      marginX,
      kpis: [
        { label: 'Total Customers', value: `${options.summary.totalCustomers}` },
        { label: 'New Customers', value: `${options.summary.newCustomers}` },
        { label: 'Returning Customers', value: `${options.summary.returningCustomers}` },
      ],
      didDrawPage,
    });

    y = (getLastAutoTableFinalY(doc) ?? y) + 8;
    addSectionTitle(doc, { title: 'Top Customers', x: marginX, y });
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [['Customer', 'Orders', 'Total Spent']],
      body: options.topCustomers.map((c) => [
        c.customerName,
        `${c.orderCount}`,
        formatCurrency(c.totalSpent, c.currency || currency),
      ]),
      theme: 'grid',
      margin: { left: marginX, right: marginX, top: y, bottom: 24 },
      styles: {
        font: 'helvetica',
        fontSize: 9,
        textColor: [30, 30, 30],
        lineColor: [220, 220, 220],
        lineWidth: 0.1,
        cellPadding: 2.5,
      },
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [30, 30, 30],
        fontStyle: 'bold',
      },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      columnStyles: {
        0: { cellWidth: 95 },
        1: { cellWidth: 25, halign: 'right' },
        2: { cellWidth: 50, halign: 'right' },
      },
      didDrawPage,
    });
  }

  didDrawPage();
  doc.save(`${options.fileName}.pdf`);
};

export const exportOrderPdf = async (options: {
  order: Order;
  fileName: string;
  business?: business;
  isAdmin?: boolean;
}): Promise<void> => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const logoDataUrl = options.business?.logo ? await loadImageAsDataUrl(options.business.logo) : null;
  const order = options.order;
  const isAdmin = Boolean(options.isAdmin);

  const headerOptions: BrandedHeaderOptions = {
    business: options.business,
    logoDataUrl,
    documentTitle: 'ORDER DETAILS',
    detailLines: [
      { label: 'Order #', value: safeText(order.orderNumber) },
      { label: 'Status', value: safeText(order.status) },
      { label: 'Date', value: formatDate(toDate(order.createdAt)) },
    ],
  };

  const headerInfo = drawBrandedHeader(doc, headerOptions);
  const didDrawPage = () => {
    drawBrandedHeader(doc, headerOptions);
    drawBrandedFooter(doc, { business: options.business });
  };

  let y = headerInfo.startY;
  const marginX = headerInfo.marginX;

  if (isAdmin) {
    addSectionTitle(doc, { title: 'Customer', x: marginX, y });
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [['Field', 'Value']],
      body: [
        ['Name', safeText(order.customerName) || 'N/A'],
        ['Email', safeText(order.customerEmail) || 'N/A'],
      ],
      theme: 'grid',
      margin: { left: marginX, right: marginX, top: y, bottom: 24 },
      styles: {
        font: 'helvetica',
        fontSize: 9,
        textColor: [30, 30, 30],
        lineColor: [220, 220, 220],
        lineWidth: 0.1,
        cellPadding: 2.5,
      },
      headStyles: { fillColor: [240, 240, 240], textColor: [30, 30, 30], fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 120 } },
      didDrawPage,
    });

    y = (getLastAutoTableFinalY(doc) ?? y) + 8;
  }

  addSectionTitle(doc, { title: 'Items', x: marginX, y });
  y += 6;

  autoTable(doc, {
    startY: y,
    head: [['Product', 'Qty', 'Unit Price', 'Subtotal']],
    body: order.items.map((item) => [
      safeText(item.productName),
      safeText(item.quantity),
      formatCurrency(item.unitPrice ?? item.subtotal / Math.max(1, item.quantity), order.pricing.currency),
      formatCurrency(item.subtotal, order.pricing.currency),
    ]),
    theme: 'grid',
    margin: { left: marginX, right: marginX, top: y, bottom: 24 },
    styles: {
      font: 'helvetica',
      fontSize: 9,
      textColor: [30, 30, 30],
      lineColor: [220, 220, 220],
      lineWidth: 0.1,
      cellPadding: 2.5,
    },
    headStyles: { fillColor: [240, 240, 240], textColor: [30, 30, 30], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 15, halign: 'center' },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 35, halign: 'right' },
    },
    didDrawPage,
  });

  y = (getLastAutoTableFinalY(doc) ?? y) + 8;
  addSectionTitle(doc, { title: 'Pricing', x: marginX, y });
  y += 6;

  const pricingRows: Array<[string, string]> = [];
  pricingRows.push(['Subtotal', formatCurrency(order.pricing.subtotal, order.pricing.currency)]);
  if (typeof order.pricing.discount === 'number' && order.pricing.discount > 0) {
    pricingRows.push(['Discount', `-${formatCurrency(order.pricing.discount, order.pricing.currency)}`]);
  }
  if (typeof order.pricing.shipping === 'number' && order.pricing.shipping > 0) {
    pricingRows.push(['Shipping', formatCurrency(order.pricing.shipping, order.pricing.currency)]);
  }
  if (typeof order.pricing.tax === 'number' && order.pricing.tax > 0) {
    pricingRows.push(['Tax', formatCurrency(order.pricing.tax, order.pricing.currency)]);
  }
  pricingRows.push(['Total', formatCurrency(order.pricing.total, order.pricing.currency)]);

  autoTable(doc, {
    startY: y,
    head: [['Description', 'Amount']],
    body: pricingRows,
    theme: 'grid',
    margin: { left: marginX, right: marginX, top: y, bottom: 24 },
    styles: {
      font: 'helvetica',
      fontSize: 9,
      textColor: [30, 30, 30],
      lineColor: [220, 220, 220],
      lineWidth: 0.1,
      cellPadding: 2.5,
    },
    headStyles: { fillColor: [240, 240, 240], textColor: [30, 30, 30], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 70, halign: 'right' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.row.index === pricingRows.length - 1) {
        data.cell.styles.fontStyle = 'bold';
      }
    },
    didDrawPage,
  });

  y = (getLastAutoTableFinalY(doc) ?? y) + 8;
  if (order.payment) {
    addSectionTitle(doc, { title: 'Payment', x: marginX, y });
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [['Field', 'Value']],
      body: [
        ['Method', formatPaymentMethod(order.payment.paymentMethod) || 'N/A'],
        ['Amount', formatCurrency(order.payment.amount || order.pricing.total, order.pricing.currency)],
        ...(order.payment.paidAt ? [['Paid At', formatDateTime(toDate(order.payment.paidAt))]] : []),
      ],
      theme: 'grid',
      margin: { left: marginX, right: marginX, top: y, bottom: 24 },
      styles: {
        font: 'helvetica',
        fontSize: 9,
        textColor: [30, 30, 30],
        lineColor: [220, 220, 220],
        lineWidth: 0.1,
        cellPadding: 2.5,
      },
      headStyles: { fillColor: [240, 240, 240], textColor: [30, 30, 30], fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 120 } },
      didDrawPage,
    });

    y = (getLastAutoTableFinalY(doc) ?? y) + 8;
  }

  if (order.delivery?.address) {
    addSectionTitle(doc, { title: 'Delivery', x: marginX, y });
    y += 6;

    const addr = order.delivery.address;
    const addrLines: Array<[string, string]> = [];
    if (addr.areaOrVillage) addrLines.push(['Area/Village', addr.areaOrVillage]);
    if (addr.traditionalAuthority) addrLines.push(['Traditional Authority', addr.traditionalAuthority]);
    if (addr.district) addrLines.push(['District', addr.district]);
    if (addr.region || addr.country) {
      addrLines.push(['Region/Country', `${safeText(addr.region)}, ${safeText(addr.country || 'Malawi')}`.replace(/^,\s*/, '')]);
    }
    if (addr.phone) addrLines.push(['Phone', addr.phone]);

    autoTable(doc, {
      startY: y,
      head: [['Field', 'Value']],
      body: addrLines,
      theme: 'grid',
      margin: { left: marginX, right: marginX, top: y, bottom: 24 },
      styles: {
        font: 'helvetica',
        fontSize: 9,
        textColor: [30, 30, 30],
        lineColor: [220, 220, 220],
        lineWidth: 0.1,
        cellPadding: 2.5,
      },
      headStyles: { fillColor: [240, 240, 240], textColor: [30, 30, 30], fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 120 } },
      didDrawPage,
    });
  }

  didDrawPage();
  doc.save(`${options.fileName}.pdf`);
};

export const exportBookingPdf = async (options: {
  booking: Booking;
  fileName: string;
  business?: business;
  isAdmin?: boolean;
}): Promise<void> => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const logoDataUrl = options.business?.logo ? await loadImageAsDataUrl(options.business.logo) : null;
  const booking = options.booking;
  const isAdmin = Boolean(options.isAdmin);

  const start = toDate(booking.timeSlot?.startTime);
  const end = toDate(booking.timeSlot?.endTime);

  const headerOptions: BrandedHeaderOptions = {
    business: options.business,
    logoDataUrl,
    documentTitle: 'BOOKING DETAILS',
    detailLines: [
      { label: 'Booking #', value: safeText(booking.bookingNumber) },
      { label: 'Status', value: safeText(booking.status) },
      { label: 'Date', value: formatDate(toDate(booking.createdAt)) },
    ],
  };

  const headerInfo = drawBrandedHeader(doc, headerOptions);
  const didDrawPage = () => {
    drawBrandedHeader(doc, headerOptions);
    drawBrandedFooter(doc, { business: options.business });
  };

  let y = headerInfo.startY;
  const marginX = headerInfo.marginX;

  if (isAdmin) {
    addSectionTitle(doc, { title: 'Customer', x: marginX, y });
    y += 6;
    autoTable(doc, {
      startY: y,
      head: [['Field', 'Value']],
      body: [
        ['Name', safeText(booking.customerName) || 'N/A'],
        ['Email', safeText(booking.customerEmail) || 'N/A'],
        ...(booking.customerPhone ? [['Phone', booking.customerPhone]] : []),
      ],
      theme: 'grid',
      margin: { left: marginX, right: marginX, top: y, bottom: 24 },
      styles: {
        font: 'helvetica',
        fontSize: 9,
        textColor: [30, 30, 30],
        lineColor: [220, 220, 220],
        lineWidth: 0.1,
        cellPadding: 2.5,
      },
      headStyles: { fillColor: [240, 240, 240], textColor: [30, 30, 30], fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 120 } },
      didDrawPage,
    });
    y = (getLastAutoTableFinalY(doc) ?? y) + 8;
  }

  addSectionTitle(doc, { title: 'Service', x: marginX, y });
  y += 6;
  autoTable(doc, {
    startY: y,
    head: [['Field', 'Value']],
    body: [
      ['Service', safeText(booking.serviceName) || 'N/A'],
      ['Date', formatDate(start)],
      ['Time', `${formatDateTime(start)} - ${formatDateTime(end)}`],
      ['Duration (min)', safeText(booking.timeSlot?.duration) || ''],
    ],
    theme: 'grid',
    margin: { left: marginX, right: marginX, top: y, bottom: 24 },
    styles: {
      font: 'helvetica',
      fontSize: 9,
      textColor: [30, 30, 30],
      lineColor: [220, 220, 220],
      lineWidth: 0.1,
      cellPadding: 2.5,
    },
    headStyles: { fillColor: [240, 240, 240], textColor: [30, 30, 30], fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 120 } },
    didDrawPage,
  });

  y = (getLastAutoTableFinalY(doc) ?? y) + 8;
  addSectionTitle(doc, { title: 'Pricing', x: marginX, y });
  y += 6;

  const currency = booking.pricing.currency;
  const pricingRows: Array<[string, string]> = [];
  const isPartial = Boolean(booking.pricing.isPartialPayment);
  if (isPartial) {
    pricingRows.push(['Booking Fee', formatCurrency(booking.pricing.bookingFee || 0, currency)]);
    pricingRows.push(['Tax', formatCurrency(booking.pricing.tax || 0, currency)]);
    pricingRows.push(['Amount Paid', formatCurrency(booking.pricing.total, currency)]);
    const totalFee = booking.pricing.totalFee || booking.pricing.basePrice;
    const remaining = totalFee - (booking.pricing.bookingFee || 0);
    if (remaining > 0) pricingRows.push(['Remaining Balance', formatCurrency(remaining, currency)]);
    pricingRows.push(['Total Service Fee', formatCurrency(totalFee, currency)]);
  } else {
    pricingRows.push(['Service Fee', formatCurrency(booking.pricing.basePrice, currency)]);
    if (typeof booking.pricing.tax === 'number' && booking.pricing.tax > 0) {
      pricingRows.push(['Tax', formatCurrency(booking.pricing.tax, currency)]);
    }
    pricingRows.push(['Total Paid', formatCurrency(booking.pricing.total, currency)]);
  }

  autoTable(doc, {
    startY: y,
    head: [['Description', 'Amount']],
    body: pricingRows,
    theme: 'grid',
    margin: { left: marginX, right: marginX, top: y, bottom: 24 },
    styles: {
      font: 'helvetica',
      fontSize: 9,
      textColor: [30, 30, 30],
      lineColor: [220, 220, 220],
      lineWidth: 0.1,
      cellPadding: 2.5,
    },
    headStyles: { fillColor: [240, 240, 240], textColor: [30, 30, 30], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 70, halign: 'right' },
    },
    didDrawPage,
  });

  y = (getLastAutoTableFinalY(doc) ?? y) + 8;
  if (booking.payment) {
    addSectionTitle(doc, { title: 'Payment', x: marginX, y });
    y += 6;
    autoTable(doc, {
      startY: y,
      head: [['Field', 'Value']],
      body: [
        ['Method', formatPaymentMethod(booking.payment.paymentMethod) || 'N/A'],
        ['Amount', formatCurrency(booking.payment.amount || booking.pricing.total, currency)],
        ...(booking.payment.paidAt ? [['Paid At', formatDateTime(toDate(booking.payment.paidAt))]] : []),
      ],
      theme: 'grid',
      margin: { left: marginX, right: marginX, top: y, bottom: 24 },
      styles: {
        font: 'helvetica',
        fontSize: 9,
        textColor: [30, 30, 30],
        lineColor: [220, 220, 220],
        lineWidth: 0.1,
        cellPadding: 2.5,
      },
      headStyles: { fillColor: [240, 240, 240], textColor: [30, 30, 30], fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 120 } },
      didDrawPage,
    });
  }

  didDrawPage();
  doc.save(`${options.fileName}.pdf`);
};

export const exportDashboardPdf = async (options: {
  fileName: string;
  business?: business;
  dateRangeLabel: string;
  metrics: Array<KpiLine>;
  recentItems: Array<{ type: string; number: string; status: string; amount: string; date: string }>;
  topItems: Array<{ name: string; sales: string; revenue: string }>;
}): Promise<void> => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const logoDataUrl = options.business?.logo ? await loadImageAsDataUrl(options.business.logo) : null;

  const headerOptions: BrandedHeaderOptions = {
    business: options.business,
    logoDataUrl,
    documentTitle: 'DASHBOARD',
    detailLines: [
      { label: 'Range', value: options.dateRangeLabel },
      { label: 'Generated', value: formatDate(new Date()) },
    ],
  };
  const headerInfo = drawBrandedHeader(doc, headerOptions);
  const didDrawPage = () => {
    drawBrandedHeader(doc, headerOptions);
    drawBrandedFooter(doc, { business: options.business });
  };

  let y = headerInfo.startY;
  const marginX = headerInfo.marginX;

  addSectionTitle(doc, { title: 'Key Metrics', x: marginX, y });
  y += 6;
  addKpiTable(doc, { startY: y, marginX, kpis: options.metrics, didDrawPage });

  y = (getLastAutoTableFinalY(doc) ?? y) + 8;
  addSectionTitle(doc, { title: 'Recent Activity', x: marginX, y });
  y += 6;
  autoTable(doc, {
    startY: y,
    head: [['Type', 'Number', 'Status', 'Amount', 'Date']],
    body: options.recentItems.map((r) => [r.type, r.number, r.status, r.amount, r.date]),
    theme: 'grid',
    margin: { left: marginX, right: marginX, top: y, bottom: 24 },
    styles: {
      font: 'helvetica',
      fontSize: 9,
      textColor: [30, 30, 30],
      lineColor: [220, 220, 220],
      lineWidth: 0.1,
      cellPadding: 2.5,
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [30, 30, 30],
      fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 40 },
      2: { cellWidth: 30 },
      3: { cellWidth: 35, halign: 'right' },
      4: { cellWidth: 40 },
    },
    didDrawPage,
  });

  y = (getLastAutoTableFinalY(doc) ?? y) + 8;
  addSectionTitle(doc, { title: 'Top Items', x: marginX, y });
  y += 6;
  autoTable(doc, {
    startY: y,
    head: [['Item', 'Sales', 'Revenue']],
    body: options.topItems.map((t) => [t.name, t.sales, t.revenue]),
    theme: 'grid',
    margin: { left: marginX, right: marginX, top: y, bottom: 24 },
    styles: {
      font: 'helvetica',
      fontSize: 9,
      textColor: [30, 30, 30],
      lineColor: [220, 220, 220],
      lineWidth: 0.1,
      cellPadding: 2.5,
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [30, 30, 30],
      fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    columnStyles: {
      0: { cellWidth: 110 },
      1: { cellWidth: 30, halign: 'right' },
      2: { cellWidth: 30, halign: 'right' },
    },
    didDrawPage,
  });

  didDrawPage();
  doc.save(`${options.fileName}.pdf`);
};

export const exportAnalyticsPdf = async (options: {
  fileName: string;
  business?: business;
  dateRangeLabel: string;
  metrics: Array<KpiLine>;
  topItems: Array<{ name: string; sales: string; revenue: string }>;
  statusDistribution: Array<{ status: string; count: string }>;
}): Promise<void> => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const logoDataUrl = options.business?.logo ? await loadImageAsDataUrl(options.business.logo) : null;

  const headerOptions: BrandedHeaderOptions = {
    business: options.business,
    logoDataUrl,
    documentTitle: 'ANALYTICS',
    detailLines: [
      { label: 'Range', value: options.dateRangeLabel },
      { label: 'Generated', value: formatDate(new Date()) },
    ],
  };
  const headerInfo = drawBrandedHeader(doc, headerOptions);
  const didDrawPage = () => {
    drawBrandedHeader(doc, headerOptions);
    drawBrandedFooter(doc, { business: options.business });
  };

  let y = headerInfo.startY;
  const marginX = headerInfo.marginX;

  addSectionTitle(doc, { title: 'Key Metrics', x: marginX, y });
  y += 6;
  addKpiTable(doc, { startY: y, marginX, kpis: options.metrics, didDrawPage });

  y = (getLastAutoTableFinalY(doc) ?? y) + 8;
  addSectionTitle(doc, { title: 'Top Items', x: marginX, y });
  y += 6;
  autoTable(doc, {
    startY: y,
    head: [['Item', 'Sales', 'Revenue']],
    body: options.topItems.map((t) => [t.name, t.sales, t.revenue]),
    theme: 'grid',
    margin: { left: marginX, right: marginX, top: y, bottom: 24 },
    styles: {
      font: 'helvetica',
      fontSize: 9,
      textColor: [30, 30, 30],
      lineColor: [220, 220, 220],
      lineWidth: 0.1,
      cellPadding: 2.5,
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [30, 30, 30],
      fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    columnStyles: {
      0: { cellWidth: 110 },
      1: { cellWidth: 30, halign: 'right' },
      2: { cellWidth: 30, halign: 'right' },
    },
    didDrawPage,
  });

  y = (getLastAutoTableFinalY(doc) ?? y) + 8;
  addSectionTitle(doc, { title: 'Status Distribution', x: marginX, y });
  y += 6;
  autoTable(doc, {
    startY: y,
    head: [['Status', 'Count']],
    body: options.statusDistribution.map((s) => [s.status, s.count]),
    theme: 'grid',
    margin: { left: marginX, right: marginX, top: y, bottom: 24 },
    styles: {
      font: 'helvetica',
      fontSize: 9,
      textColor: [30, 30, 30],
      lineColor: [220, 220, 220],
      lineWidth: 0.1,
      cellPadding: 2.5,
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [30, 30, 30],
      fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    columnStyles: {
      0: { cellWidth: 110 },
      1: { cellWidth: 60, halign: 'right' },
    },
    didDrawPage,
  });

  didDrawPage();
  doc.save(`${options.fileName}.pdf`);
};

export const exportCustomersPdf = async (options: {
  customers: Array<User & { id?: string }>;
  fileName: string;
  business?: business;
}): Promise<void> => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const logoDataUrl = options.business?.logo ? await loadImageAsDataUrl(options.business.logo) : null;
  const headerOptions: BrandedHeaderOptions = {
    business: options.business,
    logoDataUrl,
    documentTitle: 'CUSTOMERS',
    detailLines: [
      { label: 'Total', value: `${options.customers.length}` },
      { label: 'Generated', value: formatDate(new Date()) },
    ],
  };
  const headerInfo = drawBrandedHeader(doc, headerOptions);

  const body = options.customers.map((c) => {
    const joined = c.createdAt;
    return [
      c.displayName || `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'N/A',
      c.email || 'N/A',
      c.phone || '-',
      c.isActive !== false ? 'Active' : 'Inactive',
      joined ? formatDate(toDate(joined)) : '-',
    ];
  });

  autoTable(doc, {
    startY: headerInfo.startY,
    head: [['Name', 'Email', 'Phone', 'Status', 'Joined']],
    body,
    theme: 'grid',
    margin: { left: headerInfo.marginX, right: headerInfo.marginX, top: headerInfo.startY, bottom: 24 },
    styles: {
      font: 'helvetica',
      fontSize: 9,
      textColor: [30, 30, 30],
      lineColor: [220, 220, 220],
      lineWidth: 0.1,
      cellPadding: 2.5,
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [30, 30, 30],
      fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    columnStyles: {
      0: { cellWidth: 42 },
      1: { cellWidth: 60 },
      2: { cellWidth: 28 },
      3: { cellWidth: 20 },
      4: { cellWidth: 30 },
    },
    didDrawPage: () => {
      drawBrandedHeader(doc, headerOptions);
      drawBrandedFooter(doc, { business: options.business });
    },
  });

  doc.save(`${options.fileName}.pdf`);
};

export const exportPaymentsPdf = async (options: {
  payments: Array<PaymentSession & { id?: string }>;
  fileName: string;
  title?: string;
  business?: business;
}): Promise<void> => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const logoDataUrl = options.business?.logo ? await loadImageAsDataUrl(options.business.logo) : null;
  const headerOptions: BrandedHeaderOptions = {
    business: options.business,
    logoDataUrl,
    documentTitle: (options.title || 'PAYMENTS').toUpperCase(),
    detailLines: [
      { label: 'Total', value: `${options.payments.length}` },
      { label: 'Generated', value: formatDate(new Date()) },
    ],
  };
  const headerInfo = drawBrandedHeader(doc, headerOptions);

  const body = options.payments.map((p) => {
    const link = p.orderId ? `Order: ${p.orderId}` : p.bookingId ? `Booking: ${p.bookingId}` : 'N/A';
    return [
      p.txRef,
      p.customerName || 'N/A',
      p.customerEmail,
      formatCurrency(p.amount, p.currency),
      formatPaymentMethod(p.paymentMethod),
      link,
      p.status,
      formatDate(toDate(p.createdAt)),
    ];
  });

  autoTable(doc, {
    startY: headerInfo.startY,
    head: [[
      'Tx Ref',
      'Customer',
      'Email',
      'Amount',
      'Method',
      'Order/Booking',
      'Status',
      'Date',
    ]],
    body,
    theme: 'grid',
    margin: { left: headerInfo.marginX, right: headerInfo.marginX, top: headerInfo.startY, bottom: 24 },
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      textColor: [30, 30, 30],
      lineColor: [220, 220, 220],
      lineWidth: 0.1,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [30, 30, 30],
      fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    columnStyles: {
      0: { cellWidth: 26 },
      1: { cellWidth: 22 },
      2: { cellWidth: 34 },
      3: { cellWidth: 20, halign: 'right' },
      4: { cellWidth: 16 },
      5: { cellWidth: 26 },
      6: { cellWidth: 14 },
      7: { cellWidth: 22 },
    },
    didDrawPage: () => {
      drawBrandedHeader(doc, headerOptions);
      drawBrandedFooter(doc, { business: options.business });
    },
  });

  doc.save(`${options.fileName}.pdf`);
};

export const exportPaymentReceiptPdf = async (options: {
  payment: PaymentSession & { id?: string };
  fileName: string;
  orderNumber?: string;
  bookingNumber?: string;
  business?: business;
}): Promise<void> => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const logoDataUrl = options.business?.logo ? await loadImageAsDataUrl(options.business.logo) : null;
  const headerOptions: BrandedHeaderOptions = {
    business: options.business,
    logoDataUrl,
    documentTitle: 'PAYMENT RECEIPT',
    detailLines: [
      { label: 'Tx Ref', value: options.payment.txRef },
      { label: 'Status', value: options.payment.status },
      { label: 'Date', value: formatDate(toDate(options.payment.createdAt)) },
    ],
  };
  const headerInfo = drawBrandedHeader(doc, headerOptions);

  const marginX = headerInfo.marginX;
  let y = headerInfo.startY;

  const addRow = (label: string, value: string) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(90, 90, 90);
    doc.setFontSize(10);
    doc.text(label, marginX, y);

    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'bold');
    doc.text(value, marginX + 38, y);

    y += 8;
  };

  addRow('Status:', options.payment.status);
  addRow('Amount:', formatCurrency(options.payment.amount, options.payment.currency));
  addRow('Method:', formatPaymentMethod(options.payment.paymentMethod));
  addRow('Customer:', options.payment.customerName || 'N/A');
  addRow('Email:', options.payment.customerEmail);
  addRow('Date:', formatDate(toDate(options.payment.createdAt)));

  if (options.orderNumber) {
    addRow('Order:', options.orderNumber);
  } else if (options.bookingNumber) {
    addRow('Booking:', options.bookingNumber);
  } else if (options.payment.orderId) {
    addRow('Order ID:', options.payment.orderId);
  } else if (options.payment.bookingId) {
    addRow('Booking ID:', options.payment.bookingId);
  }

  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.3);
  doc.line(marginX, y + 2, doc.internal.pageSize.getWidth() - marginX, y + 2);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(110, 110, 110);
  doc.setFontSize(9);
  doc.text('This is a computer-generated receipt.', marginX, y + 12);

  drawBrandedFooter(doc, { business: options.business });

  doc.save(`${options.fileName}.pdf`);
};

export const exportLedgerPdf = async (options: {
  entries: Array<(LedgerEntry & { id?: string }) & { balance?: number }>;
  fileName: string;
  title?: string;
  business?: business;
}): Promise<void> => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const logoDataUrl = options.business?.logo ? await loadImageAsDataUrl(options.business.logo) : null;
  const headerOptions: BrandedHeaderOptions = {
    business: options.business,
    logoDataUrl,
    documentTitle: (options.title || 'LEDGER').toUpperCase(),
    detailLines: [
      { label: 'Entries', value: `${options.entries.length}` },
      { label: 'Generated', value: formatDate(new Date()) },
    ],
  };
  const headerInfo = drawBrandedHeader(doc, headerOptions);

  const body = options.entries.map((e) => {
    const createdAt = e.createdAt;
    return [
      e.id ? `${e.id.substring(0, 10)}...` : 'N/A',
      formatDate(toDate(createdAt)),
      e.entryType,
      e.status,
      formatCurrency(e.amount, e.currency),
      typeof e.balance === 'number' ? formatCurrency(e.balance, e.currency) : '-',
      e.description || '',
    ];
  });

  autoTable(doc, {
    startY: headerInfo.startY,
    head: [['Entry', 'Date', 'Type', 'Status', 'Amount', 'Balance', 'Description']],
    body,
    theme: 'grid',
    margin: { left: headerInfo.marginX, right: headerInfo.marginX, top: headerInfo.startY, bottom: 24 },
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      textColor: [30, 30, 30],
      lineColor: [220, 220, 220],
      lineWidth: 0.1,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [30, 30, 30],
      fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    columnStyles: {
      0: { cellWidth: 18 },
      1: { cellWidth: 26 },
      2: { cellWidth: 24 },
      3: { cellWidth: 18 },
      4: { cellWidth: 22, halign: 'right' },
      5: { cellWidth: 22, halign: 'right' },
      6: { cellWidth: 56 },
    },
    didDrawPage: () => {
      drawBrandedHeader(doc, headerOptions);
      drawBrandedFooter(doc, { business: options.business });
    },
  });

  doc.save(`${options.fileName}.pdf`);
};
