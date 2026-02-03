/**
 * Export button component for orders and bookings
 * Supports PDF and CSV export formats
 */

import React, { useState } from 'react';
import { Download, FileText, Table } from 'lucide-react';
import { Button } from './Button';
import { useToast } from '@/components/ui';
import { Order } from '@/types/order';
import { Booking } from '@/types/booking';
import { business } from '@/types/business';
import { exportBookingPdf, exportOrderPdf } from '@/lib/exports/exports';
import { 
  generateOrderCSV, 
  generateBookingCSV 
} from '@/lib/utils/export';

export interface ExportButtonProps {
  data: Order | Booking;
  type: 'order' | 'booking';
  isAdmin?: boolean;
  businessData?: business | null;
  className?: string;
}

export function ExportButton({ data, type, isAdmin = false, businessData, className }: ExportButtonProps) {
  const toast = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      if (type === 'order') {
        const order = data as Order;
        await exportOrderPdf({
          order,
          isAdmin,
          business: businessData || undefined,
          fileName: `order-${order.orderNumber}`,
        });
      } else {
        const booking = data as Booking;
        await exportBookingPdf({
          booking,
          isAdmin,
          business: businessData || undefined,
          fileName: `booking-${booking.bookingNumber}`,
        });
      }
      toast.showSuccess(`${type === 'order' ? 'Order' : 'Booking'} PDF downloaded successfully`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.showError('Failed to download PDF');
    } finally {
      setIsExporting(false);
      setShowDropdown(false);
    }
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      if (type === 'order') {
        generateOrderCSV(data as Order, isAdmin);
      } else {
        generateBookingCSV(data as Booking, isAdmin);
      }
      toast.showSuccess(`${type === 'order' ? 'Order' : 'Booking'} CSV exported successfully`);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.showError('Failed to export CSV');
    } finally {
      setIsExporting(false);
      setShowDropdown(false);
    }
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={isExporting}
        className={className}
      >
        <Download className="w-4 h-4 mr-2" />
        Export
      </Button>

      {showDropdown && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-20">
            <div className="py-1">
              <button
                onClick={handleExportPDF}
                disabled={isExporting}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                <FileText className="w-4 h-4 mr-2" />
                Export as PDF
              </button>
              <button
                onClick={handleExportCSV}
                disabled={isExporting}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                <Table className="w-4 h-4 mr-2" />
                Export as CSV
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
