/**
 * Utility functions for invoice generation
 */

export const generateInvoiceNumber = (businessName: string): string => {
  // Get business short form (first 3-4 letters, uppercase)
  const shortForm = businessName
    .replace(/[^a-zA-Z0-9]/g, '') // Remove special characters
    .substring(0, 4)
    .toUpperCase();
  
  // Get current date in format DDMMYY
  const today = new Date();
  const dateStr = today.getDate().toString().padStart(2, '0') +
                 (today.getMonth() + 1).toString().padStart(2, '0') +
                 today.getFullYear().toString().slice(-2);
  
  // Generate random 4-digit number
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  
  return `INV-${shortForm}-${dateStr}-${randomNum}`;
};

export const formatInvoiceDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export const formatInvoiceDateTime = (date: Date): string => {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};
