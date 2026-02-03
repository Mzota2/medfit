/**
 * Export utilities for orders and bookings
 * Supports PDF and CSV export formats
 */

import { Order } from '@/types/order';
import { Booking } from '@/types/booking';
import { business } from '@/types/business';
import { formatCurrency, formatDate, formatDateTime } from './formatting';
import { Timestamp } from 'firebase/firestore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type JsPdfWithAutoTable = jsPDF & { lastAutoTable?: { finalY?: number } };
const getLastAutoTableFinalY = (doc: jsPDF): number | undefined => {
  return (doc as unknown as JsPdfWithAutoTable).lastAutoTable?.finalY;
};

type JsPdfWithInternalPages = jsPDF & { internal: { getNumberOfPages: () => number } };
const getPageCount = (doc: jsPDF): number => {
  return (doc as unknown as JsPdfWithInternalPages).internal.getNumberOfPages();
};

// Helper function to handle Timestamp conversion
const toDate = (date: Date | string | Timestamp): Date => {
  if (date instanceof Timestamp) {
    return date.toDate();
  }
  if (typeof date === 'string') {
    return new Date(date);
  }
  return date;
};

// Helper function to add header with branding
const addHeader = (doc: jsPDF, title: string, subtitle: string, businessData?: business | null) => {
  // Define content boundaries
  const leftMargin = 25;
  const contentWidth = 160;
  const rightMargin = leftMargin + contentWidth;
  
  // Add header background with neutral color (reduced height)
  doc.setFillColor(245, 245, 245); // Light gray background
  doc.rect(0, 0, 210, 60, 'F'); // Reduced from 80 to 60
  
  // Add border
  doc.setDrawColor(200, 200, 200);
  doc.rect(0, 0, 210, 60);
  
  // Add logo image if available, otherwise placeholder
  if (businessData?.logo) {
    try {
      // Add actual logo image
      doc.addImage(businessData.logo, 'JPEG', leftMargin, 10, 25, 25);
    } catch {
      // Fallback to placeholder if image fails
      doc.setFillColor(51, 51, 51);
      doc.rect(leftMargin, 10, 25, 25, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('LOGO', leftMargin + 12.5, 25, { align: 'center' });
    }
  } else {
    // Logo placeholder
    doc.setFillColor(51, 51, 51);
    doc.rect(leftMargin, 10, 25, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('LOGO', leftMargin + 12.5, 25, { align: 'center' });
  }
  
  // Add business name (positioned after logo)
  doc.setTextColor(51, 51, 51);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(businessData?.name || 'eShopCure', leftMargin + 30, 20);
  
  // Add business description with proper spacing
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const description = businessData?.description || 'Your Trusted Shopping Partner';
  const splitDescription = doc.splitTextToSize(description, contentWidth - 30);
  doc.text(splitDescription, leftMargin + 30, 30);
  
  // Add gap between description and contact info
  const descriptionHeight = splitDescription.length * 4; // Approximate height of description
  const contactInfoYPosition = 30 + descriptionHeight + 5; // Add 5px gap
  
  // Add contact information on new line with proper spacing
  const contactInfo = businessData?.contactInfo;
  const contactText = [
    contactInfo?.email || 'info@eshopcure.com',
    contactInfo?.phone || '+265 999 123 456',
    contactInfo?.website || 'www.eshopcure.com'
  ].filter(Boolean).join(' | ');
  
  doc.setFont('courier', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(102, 102, 102); // Medium gray for contact info
  const splitContact = doc.splitTextToSize(contactText, contentWidth - 30);
  doc.text(splitContact, leftMargin + 30, contactInfoYPosition);
  
  // Add document title with proper alignment
  doc.setTextColor(51, 51, 51);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(title, leftMargin, 70);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text(subtitle, leftMargin, 78);
  
  return { yPosition: 88, leftMargin, contentWidth, rightMargin }; // Return layout info
};

// Helper function to add footer
const addFooter = (doc: jsPDF, businessData?: business | null) => {
  const pageCount = getPageCount(doc);
  const pageHeight = doc.internal.pageSize.height;
  
  // Add footer background with neutral color (reduced height)
  doc.setFillColor(245, 245, 245);
  doc.rect(0, pageHeight - 20, 210, 20, 'F'); // Reduced from 25 to 20
  
  // Add border
  doc.setDrawColor(200, 200, 200);
  doc.rect(0, pageHeight - 20, 210, 20);
  
  doc.setTextColor(102, 102, 102);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Thank you for choosing ${businessData?.name || 'eShopCure'}!`, 105, pageHeight - 12, { align: 'center' });
  doc.text(`Page ${pageCount}`, 105, pageHeight - 6, { align: 'center' });
};

// Helper function to check if content will overflow and add new page if needed
const checkPageOverflow = (doc: jsPDF, layout: { yPosition: number; leftMargin: number; contentWidth: number; rightMargin: number }, requiredHeight: number = 20) => {
  const pageHeight = doc.internal.pageSize.height;
  const footerHeight = 20;
  const maxYPosition = pageHeight - footerHeight - requiredHeight;
  
  if (layout.yPosition > maxYPosition) {
    doc.addPage();
    return { ...layout, yPosition: 88 }; // Reset to start position after header
  }
  
  return layout;
};

// Helper function to add section header
const addSectionHeader = (doc: jsPDF, title: string, layout: { yPosition: number; leftMargin: number; contentWidth: number; rightMargin: number }) => {
  // Add section header with neutral color
  doc.setFillColor(240, 240, 240);
  doc.rect(layout.leftMargin, layout.yPosition - 5, layout.contentWidth, 12, 'F');
  
  // Add border
  doc.setDrawColor(200, 200, 200);
  doc.rect(layout.leftMargin, layout.yPosition - 5, layout.contentWidth, 12);
  
  doc.setTextColor(51, 51, 51);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(title, layout.leftMargin + 5, layout.yPosition + 2);
  
  doc.setTextColor(51, 51, 51);
  return { ...layout, yPosition: layout.yPosition + 20 };
};

// PDF generation using jsPDF for direct download
export const generateOrderPDF = async (order: Order, isAdmin: boolean = false, businessData?: business | null) => {
  const doc = new jsPDF();
  
  // Add header with branding
  let layout = addHeader(doc, 'Order Details', `Order #${order.orderNumber}`, businessData);
  
  // Order status and date
  layout = checkPageOverflow(doc, layout, 20); // Check before adding content
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 51, 51);
  doc.text(`Status: ${order.status.toUpperCase()}`, layout.leftMargin, layout.yPosition);
  layout.yPosition += 8;
  doc.text(`Date: ${formatDate(toDate(order.createdAt))}`, layout.leftMargin, layout.yPosition);
  layout.yPosition += 15;
  
  // Customer information (admin only)
  if (isAdmin) {
    layout = checkPageOverflow(doc, layout, 40); // Check before adding section
    layout = addSectionHeader(doc, 'Customer Information', layout);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 51, 51);
    doc.text(`Name: ${order.customerName || 'N/A'}`, layout.leftMargin + 5, layout.yPosition);
    layout.yPosition += 8;
    doc.text(`Email: ${order.customerEmail || 'N/A'}`, layout.leftMargin + 5, layout.yPosition);
    layout.yPosition += 15;
  }
  
  // Order items table
  layout = checkPageOverflow(doc, layout, 60); // Check before adding table
  layout = addSectionHeader(doc, 'Order Items', layout);
  
  const tableData = order.items.map(item => [
    item.productName,
    item.quantity.toString(),
    formatCurrency(item.unitPrice),
    formatCurrency(item.subtotal)
  ]);
  
  autoTable(doc, {
    head: [['Product', 'Quantity', 'Unit Price', 'Subtotal']],
    body: tableData,
    startY: layout.yPosition,
    theme: 'grid',
    headStyles: { 
      fillColor: [240, 240, 240],
      textColor: 51,
      fontStyle: 'bold',
      lineWidth: 0.1
    },
    styles: { 
      fontSize: 10,
      textColor: 51,
      lineWidth: 0.1,
      cellPadding: 3
    },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    columnStyles: {
      0: { cellWidth: 75 }, // Product name column
      1: { cellWidth: 25, halign: 'center' }, // Quantity
      2: { cellWidth: 30, halign: 'right' }, // Unit Price
      3: { cellWidth: 30, halign: 'right' }  // Subtotal
    },
    margin: { left: layout.leftMargin, right: 20 }
  });
  
  layout.yPosition = (getLastAutoTableFinalY(doc) ?? layout.yPosition) + 15;
  
  // Pricing summary
  layout = checkPageOverflow(doc, layout, 60); // Check before adding section
  layout = addSectionHeader(doc, 'Pricing Summary', layout);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 51, 51);
  doc.text(`Subtotal: ${formatCurrency(order.pricing.subtotal)}`, layout.leftMargin + 5, layout.yPosition);
  layout.yPosition += 8;
  
  if (order.pricing.tax) {
    doc.text(`Tax: ${formatCurrency(order.pricing.tax)}`, layout.leftMargin + 5, layout.yPosition);
    layout.yPosition += 8;
  }
  
  if (order.pricing.shipping) {
    doc.text(`Shipping: ${formatCurrency(order.pricing.shipping)}`, layout.leftMargin + 5, layout.yPosition);
    layout.yPosition += 8;
  }
  
  // Total with emphasis using neutral color
  doc.setFillColor(240, 240, 240);
  doc.rect(layout.leftMargin, layout.yPosition - 3, layout.contentWidth, 12, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.rect(layout.leftMargin, layout.yPosition - 3, layout.contentWidth, 12);
  doc.setTextColor(51, 51, 51);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(`Total: ${formatCurrency(order.pricing.total)}`, layout.leftMargin + 5, layout.yPosition + 4);
  layout.yPosition += 20;
  
  // Payment information
  if (order.payment) {
    layout = checkPageOverflow(doc, layout, 40); // Check before adding section
    layout = addSectionHeader(doc, 'Payment Information', layout);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 51, 51);
    doc.text(`Method: ${order.payment.paymentMethod || 'N/A'}`, layout.leftMargin + 5, layout.yPosition);
    layout.yPosition += 8;
    if (order.payment.paidAt) {
      doc.text(`Paid At: ${formatDateTime(toDate(order.payment.paidAt))}`, layout.leftMargin + 5, layout.yPosition);
      layout.yPosition += 8;
    }
  }
  
  // Delivery information
  if (order.delivery?.method === 'delivery') {
    layout = checkPageOverflow(doc, layout, 60); // Check before adding section
    layout = addSectionHeader(doc, 'Delivery Information', layout);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 51, 51);
    if (order.delivery.address) {
      doc.text(`Area/Village: ${order.delivery.address.areaOrVillage || 'N/A'}`, layout.leftMargin + 5, layout.yPosition);
      layout.yPosition += 8;
      doc.text(`District: ${order.delivery.address.district || 'N/A'}`, layout.leftMargin + 5, layout.yPosition);
      layout.yPosition += 8;
      doc.text(`Region: ${order.delivery.address.region || 'N/A'}`, layout.leftMargin + 5, layout.yPosition);
      layout.yPosition += 8;
    }
    if (order.delivery.trackingNumber) {
      doc.text(`Tracking Number: ${order.delivery.trackingNumber}`, layout.leftMargin + 5, layout.yPosition);
      layout.yPosition += 8;
    }
    if (order.delivery.carrier) {
      doc.text(`Carrier: ${order.delivery.carrier}`, layout.leftMargin + 5, layout.yPosition);
      layout.yPosition += 8;
    }
  }
  
  // Notes
  if (order.notes) {
    layout = checkPageOverflow(doc, layout, 40); // Check before adding section
    layout = addSectionHeader(doc, 'Notes', layout);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 51, 51);
    const splitNotes = doc.splitTextToSize(order.notes, layout.contentWidth - 10);
    doc.text(splitNotes, layout.leftMargin + 5, layout.yPosition);
    layout.yPosition += splitNotes.length * 7 + 15;
  }
  
  // Add footer to all pages
  addFooter(doc, businessData);
  
  // Save the PDF
  doc.save(`order-${order.orderNumber}.pdf`);
};

export const generateBookingPDF = async (booking: Booking, isAdmin: boolean = false, businessData?: business | null) => {
  const doc = new jsPDF();
  
  // Add header with branding
  let layout = addHeader(doc, 'Booking Details', `Booking #${booking.bookingNumber}`, businessData);
  
  // Booking status and date
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 51, 51);
  doc.text(`Status: ${booking.status.toUpperCase()}`, layout.leftMargin, layout.yPosition);
  layout.yPosition += 8;
  doc.text(`Date: ${formatDate(toDate(booking.createdAt))}`, layout.leftMargin, layout.yPosition);
  layout.yPosition += 15;
  
  // Customer information (admin only)
  if (isAdmin) {
    layout = checkPageOverflow(doc, layout, 40); // Check before adding section
    layout = addSectionHeader(doc, 'Customer Information', layout);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 51, 51);
    doc.text(`Name: ${booking.customerName || 'N/A'}`, layout.leftMargin + 5, layout.yPosition);
    layout.yPosition += 8;
    doc.text(`Email: ${booking.customerEmail || 'N/A'}`, layout.leftMargin + 5, layout.yPosition);
    layout.yPosition += 8;
    if (booking.customerPhone) {
      doc.text(`Phone: ${booking.customerPhone}`, layout.leftMargin + 5, layout.yPosition);
      layout.yPosition += 8;
    }
    layout.yPosition += 7;
  }
  
  // Service information
  layout = checkPageOverflow(doc, layout, 40); // Check before adding section
  layout = addSectionHeader(doc, 'Service Information', layout);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 51, 51);
  doc.text(`Service: ${booking.serviceName}`, layout.leftMargin + 5, layout.yPosition);
  layout.yPosition += 8;
  doc.text(`Date: ${formatDate(toDate(booking.timeSlot.startTime))}`, layout.leftMargin + 5, layout.yPosition);
  layout.yPosition += 8;
  doc.text(`Time: ${formatDateTime(toDate(booking.timeSlot.startTime))} - ${formatDateTime(toDate(booking.timeSlot.endTime))}`, layout.leftMargin + 5, layout.yPosition);
  layout.yPosition += 8;
  doc.text(`Duration: ${booking.timeSlot.duration} minutes`, layout.leftMargin + 5, layout.yPosition);
  layout.yPosition += 15;
  
  // Payment information
  layout = checkPageOverflow(doc, layout, 40); // Check before adding section
  layout = addSectionHeader(doc, 'Payment Information', layout);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 51, 51);
  doc.text(`Amount: ${formatCurrency(booking.pricing.total)}`, layout.leftMargin + 5, layout.yPosition);
  layout.yPosition += 8;
  
  if (booking.payment) {
    doc.text(`Method: ${booking.payment.paymentMethod}`, layout.leftMargin + 5, layout.yPosition);
    layout.yPosition += 8;
    doc.text(`Paid At: ${formatDateTime(toDate(booking.payment.paidAt))}`, layout.leftMargin + 5, layout.yPosition);
  } else {
    doc.text('Status: Pending Payment', layout.leftMargin + 5, layout.yPosition);
  }
  layout.yPosition += 15;
  
  // Staff notes
  if (booking.staffNotes) {
    layout = checkPageOverflow(doc, layout, 40); // Check before adding section
    layout = addSectionHeader(doc, 'Staff Notes', layout);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 51, 51);
    const splitStaffNotes = doc.splitTextToSize(booking.staffNotes, layout.contentWidth - 10);
    doc.text(splitStaffNotes, layout.leftMargin + 5, layout.yPosition);
    layout.yPosition += splitStaffNotes.length * 7 + 15;
  }
  
  // Customer notes
  if (booking.notes) {
    layout = checkPageOverflow(doc, layout, 40); // Check before adding section
    layout = addSectionHeader(doc, 'Customer Notes', layout);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 51, 51);
    const splitNotes = doc.splitTextToSize(booking.notes, layout.contentWidth - 10);
    doc.text(splitNotes, layout.leftMargin + 5, layout.yPosition);
  }
  
  // Add footer to all pages
  addFooter(doc, businessData);
  
  // Save the PDF
  doc.save(`booking-${booking.bookingNumber}.pdf`);
};

// CSV export
export const generateOrderCSV = (order: Order, isAdmin: boolean = false) => {
  const csvContent = generateOrderCSVContent(order, isAdmin);
  downloadCSV(csvContent, `order-${order.orderNumber}.csv`);
};

export const generateBookingCSV = (booking: Booking, isAdmin: boolean = false) => {
  const csvContent = generateBookingCSVContent(booking, isAdmin);
  downloadCSV(csvContent, `booking-${booking.bookingNumber}.csv`);
};

// Helper functions
const downloadCSV = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const generateOrderCSVContent = (order: Order, isAdmin: boolean): string => {
  const headers = [
    'Order Number',
    'Date',
    'Status',
    'Customer Name',
    'Customer Email',
    'Customer Phone',
    'Items',
    'Subtotal',
    'Tax',
    'Shipping',
    'Total',
    'Payment Method',
    'Payment Status',
    'Fulfillment Method',
    'Delivery Address',
    'Tracking Number',
    'Carrier',
    'Notes'
  ];

  const itemsText = order.items.map(item => 
    `${item.productName} (${item.quantity} x ${formatCurrency(item.unitPrice)})`
  ).join('; ');

  const deliveryAddress = order.delivery?.address ? 
    `${order.delivery.address.areaOrVillage}, ${order.delivery.address.district}, ${order.delivery.address.region}` : '';

  const row = [
    order.orderNumber,
    formatDate(toDate(order.createdAt)),
    order.status,
    isAdmin ? (order.customerName || '') : '',
    isAdmin ? (order.customerEmail || '') : '',
    itemsText,
    order.pricing.subtotal.toString(),
    order.pricing.tax?.toString() || '',
    order.pricing.shipping?.toString() || '',
    order.pricing.total.toString(),
    order.payment?.paymentMethod || '',
    order.delivery?.method || '',
    deliveryAddress,
    order.delivery?.trackingNumber || '',
    order.delivery?.carrier || '',
    order.notes || ''
  ];

  return [headers.join(','), row.map(cell => `"${cell}"`).join(',')].join('\n');
};

const generateBookingCSVContent = (booking: Booking, isAdmin: boolean): string => {
  const headers = [
    'Booking Number',
    'Date',
    'Status',
    'Customer Name',
    'Customer Email',
    'Customer Phone',
    'Service Name',
    'Service Date',
    'Start Time',
    'End Time',
    'Duration',
    'Amount',
    'Payment Method',
    'Payment Status',
    'Paid At',
    'Staff Notes',
    'Customer Notes'
  ];

  const row = [
    booking.bookingNumber,
    formatDate(toDate(booking.createdAt)),
    booking.status,
    isAdmin ? (booking.customerName || '') : '',
    isAdmin ? (booking.customerEmail || '') : '',
    isAdmin ? (booking.customerPhone || '') : '',
    booking.serviceName,
    formatDate(toDate(booking.timeSlot.startTime)),
    formatDateTime(toDate(booking.timeSlot.startTime)),
    formatDateTime(toDate(booking.timeSlot.endTime)),
    booking.timeSlot.duration.toString(),
    booking.pricing.total.toString(),
    booking.payment?.paymentMethod || '',
    booking.payment ? formatDateTime(toDate(booking.payment.paidAt)) : '',
    booking.staffNotes || '',
    booking.notes || ''
  ];

  return [headers.join(','), row.map(cell => `"${cell}"`).join(',')].join('\n');
};
