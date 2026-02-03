/**
 * Admin Reports Page
 */


'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useOrders, useBookings, useProducts, useServices, useCustomers, useLedgerEntries } from '@/hooks';
import { Button, Input, useToast } from '@/components/ui';
import { FileText, Download, Calendar, TrendingUp, Users, Package, Calendar as CalendarIcon } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils/formatting';
import { cn } from '@/lib/utils/cn';
import { OrderStatus } from '@/types/order';
import { BookingStatus } from '@/types/booking';
import { exportReportsPdf } from '@/lib/exports/exports';

type ReportType = 'sales' | 'products' | 'services' | 'customers';

interface SalesReport {
  period: { start: Date; end: Date };
  orders: {
    total: number;
    byStatus: Record<OrderStatus, number>;
    totalRevenue: number;
    averageOrderValue: number;
  };
  bookings: {
    total: number;
    byStatus: Record<BookingStatus, number>;
    totalRevenue: number;
    averageBookingValue: number;
  };
  totalRevenue: number;
  totalTransactions: number;
}

interface ProductSalesReport {
  productId: string;
  productName: string;
  unitsSold: number;
  revenue: number;
  averagePrice: number;
}

interface ServiceBookingsReport {
  serviceId: string;
  serviceName: string;
  bookingsCount: number;
  revenue: number;
  averagePrice: number;
}

interface CustomerReport {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  topCustomers: Array<{
    customerId: string;
    customerName: string;
    totalSpent: number;
    orderCount: number;
  }>;
}

export default function AdminReportsPage() {
  const { currentBusiness } = useApp();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [reportType, setReportType] = useState<ReportType>('sales');
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [generatedReport, setGeneratedReport] = useState<string | null>(null);

  const getPeriod = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  };

  // Fetch data with React Query
  const { data: orders = [], isLoading: ordersLoading } = useOrders({
    limit: 1000,
    enabled: !!currentBusiness?.id,
  });
  const { data: bookings = [], isLoading: bookingsLoading } = useBookings({
    limit: 1000,
    enabled: !!currentBusiness?.id,
  });
  const { data: products = [] } = useProducts({
    businessId: currentBusiness?.id,
    enabled: !!currentBusiness?.id,
  });
  const { data: services = [] } = useServices({
    businessId: currentBusiness?.id,
    enabled: !!currentBusiness?.id,
  });
  const { data: customers = [] } = useCustomers({
    enabled: !!currentBusiness?.id,
  });
  const { data: ledgerEntries = [] } = useLedgerEntries({
    businessId: currentBusiness?.id,
    enabled: !!currentBusiness?.id,
  });

  const isLoading = ordersLoading || bookingsLoading;

  // Calculate reports from data
  const currentReport = useMemo<SalesReport | null>(() => {
    if (generatedReport !== 'sales' || !startDate || !endDate) return null;

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const filteredOrders = orders.filter((order) => {
      const orderDate = order.createdAt instanceof Date
        ? order.createdAt
        : (order.createdAt && typeof order.createdAt === 'object' && 'toDate' in order.createdAt && typeof order.createdAt.toDate === 'function')
        ? order.createdAt.toDate()
        : new Date();
      return orderDate >= start && orderDate <= end;
    });

    const filteredBookings = bookings.filter((booking) => {
      const bookingDate = booking.createdAt instanceof Date
        ? booking.createdAt
        : (booking.createdAt && typeof booking.createdAt === 'object' && 'toDate' in booking.createdAt && typeof booking.createdAt.toDate === 'function')
        ? booking.createdAt.toDate()
        : new Date();
      return bookingDate >= start && bookingDate <= end;
    });

    const ordersByStatus = filteredOrders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {} as Record<OrderStatus, number>);

    const ordersRevenue = filteredOrders
      .filter((order) => order.payment?.paidAt)
      .reduce((sum, order) => sum + (order.pricing.total || 0), 0);

    const averageOrderValue = filteredOrders.filter((order) => order.payment?.paidAt).length > 0
      ? ordersRevenue / filteredOrders.filter((order) => order.payment?.paidAt).length
      : 0;

    const bookingsByStatus = filteredBookings.reduce((acc, booking) => {
      acc[booking.status] = (acc[booking.status] || 0) + 1;
      return acc;
    }, {} as Record<BookingStatus, number>);

    const bookingsRevenue = filteredBookings
      .filter((booking) => booking.payment?.paidAt)
      .reduce((sum, booking) => sum + (booking.pricing.total || 0), 0);

    const averageBookingValue = filteredBookings.filter((booking) => booking.payment?.paidAt).length > 0
      ? bookingsRevenue / filteredBookings.filter((booking) => booking.payment?.paidAt).length
      : 0;

    return {
      period: { start, end },
      orders: {
        total: filteredOrders.length,
        byStatus: ordersByStatus,
        totalRevenue: ordersRevenue,
        averageOrderValue,
      },
      bookings: {
        total: filteredBookings.length,
        byStatus: bookingsByStatus,
        totalRevenue: bookingsRevenue,
        averageBookingValue,
      },
      totalRevenue: ordersRevenue + bookingsRevenue,
      totalTransactions: filteredOrders.length + filteredBookings.length,
    };
  }, [generatedReport, startDate, endDate, orders, bookings]);

  const productSalesReport = useMemo<ProductSalesReport[]>(() => {
    if (generatedReport !== 'products' || !startDate || !endDate) return [];

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const filteredOrders = orders.filter((order) => {
      const orderDate = order.createdAt instanceof Date
        ? order.createdAt
        : (order.createdAt && typeof order.createdAt === 'object' && 'toDate' in order.createdAt && typeof order.createdAt.toDate === 'function')
        ? order.createdAt.toDate()
        : new Date();
      return orderDate >= start && orderDate <= end && order.payment?.paidAt;
    });

    const productMap = new Map<string, ProductSalesReport>();

    filteredOrders.forEach((order) => {
      order.items.forEach((item) => {
        const existing = productMap.get(item.productId) || {
          productId: item.productId,
          productName: item.productName,
          unitsSold: 0,
          revenue: 0,
          averagePrice: 0,
        };

        existing.unitsSold += item.quantity;
        existing.revenue += item.subtotal;
        existing.averagePrice = existing.unitsSold > 0 ? existing.revenue / existing.unitsSold : 0;

        productMap.set(item.productId, existing);
      });
    });

    return Array.from(productMap.values());
  }, [generatedReport, startDate, endDate, orders]);

  const serviceBookingsReport = useMemo<ServiceBookingsReport[]>(() => {
    if (generatedReport !== 'services' || !startDate || !endDate) return [];

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const filteredBookings = bookings.filter((booking) => {
      const bookingDate = booking.createdAt instanceof Date
        ? booking.createdAt
        : (booking.createdAt && typeof booking.createdAt === 'object' && 'toDate' in booking.createdAt && typeof booking.createdAt.toDate === 'function')
        ? booking.createdAt.toDate()
        : new Date();
      return bookingDate >= start && bookingDate <= end && booking.payment?.paidAt;
    });

    const serviceMap = new Map<string, ServiceBookingsReport>();

    filteredBookings.forEach((booking) => {
      if (!booking.serviceId) return;

      const existing = serviceMap.get(booking.serviceId) || {
        serviceId: booking.serviceId,
        serviceName: booking.serviceName || 'Service',
        bookingsCount: 0,
        revenue: 0,
        averagePrice: 0,
      };

      existing.bookingsCount += 1;
      existing.revenue += booking.pricing.total || 0;
      existing.averagePrice = existing.bookingsCount > 0 ? existing.revenue / existing.bookingsCount : 0;

      serviceMap.set(booking.serviceId, existing);
    });

    return Array.from(serviceMap.values());
  }, [generatedReport, startDate, endDate, bookings]);

  const customerReport = useMemo<CustomerReport>(() => {
    if (generatedReport !== 'customers' || !startDate || !endDate) {
      return {
        totalCustomers: customers.length,
        newCustomers: 0,
        returningCustomers: 0,
        topCustomers: [],
      };
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const newCustomers = customers.filter((customer) => {
      const customerDate = customer.createdAt instanceof Date
        ? customer.createdAt
        : (customer.createdAt && typeof customer.createdAt === 'object' && 'toDate' in customer.createdAt && typeof customer.createdAt.toDate === 'function')
        ? customer.createdAt.toDate()
        : new Date();
      return customerDate >= start && customerDate <= end;
    });

    const customerSpending = new Map<string, { customerId: string; customerName: string; totalSpent: number; orderCount: number }>();

    orders.forEach((order) => {
      if (!order.customerId) return;
      const existing = customerSpending.get(order.customerId) || {
        customerId: order.customerId,
        customerName: order.customerName || 'Unknown',
        totalSpent: 0,
        orderCount: 0,
      };
      existing.totalSpent += order.pricing.total || 0;
      existing.orderCount += 1;
      customerSpending.set(order.customerId, existing);
    });

    const topCustomers = Array.from(customerSpending.values())
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    return {
      totalCustomers: customers.length,
      newCustomers: newCustomers.length,
      returningCustomers: customers.length - newCustomers.length,
      topCustomers,
    };
  }, [generatedReport, startDate, endDate, customers, orders]);

  const handleGenerateReport = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    if (start > end) {
      toast.showWarning('Start date must be before end date');
      return;
    }

    setGeneratedReport(reportType);
    setError(null);
  };
  
  const handleExport = async () => {
    if (!generatedReport) {
      toast.showWarning('Generate a report before exporting');
      return;
    }
    try {
      const fileNameBase = `report-${generatedReport}-${startDate}-to-${endDate}`;

      const period = getPeriod();
      const business = currentBusiness || undefined;

      if (generatedReport === 'sales' && currentReport) {
        await exportReportsPdf({
          type: 'sales',
          fileName: fileNameBase,
          business,
          period: currentReport.period,
          totals: {
            totalRevenue: currentReport.totalRevenue,
            totalOrders: currentReport.orders.total,
            totalBookings: currentReport.bookings.total,
            averageOrderValue: currentReport.orders.averageOrderValue,
            averageBookingValue: currentReport.bookings.averageBookingValue,
            totalTransactions: currentReport.totalTransactions,
            currency: 'MWK',
          },
          ordersByStatus: currentReport.orders.byStatus as unknown as Record<string, number>,
          bookingsByStatus: currentReport.bookings.byStatus as unknown as Record<string, number>,
        });
        return;
      }

      if (generatedReport === 'products') {
        await exportReportsPdf({
          type: 'products',
          fileName: fileNameBase,
          business,
          period,
          currency: 'MWK',
          rows: productSalesReport.map((r) => ({
            productName: r.productName,
            unitsSold: r.unitsSold,
            revenue: r.revenue,
            averagePrice: r.averagePrice,
          })),
        });
        return;
      }

      if (generatedReport === 'services') {
        await exportReportsPdf({
          type: 'services',
          fileName: fileNameBase,
          business,
          period,
          currency: 'MWK',
          rows: serviceBookingsReport.map((r) => ({
            serviceName: r.serviceName,
            bookingsCount: r.bookingsCount,
            revenue: r.revenue,
            averagePrice: r.averagePrice,
          })),
        });
        return;
      }

      if (generatedReport === 'customers') {
        await exportReportsPdf({
          type: 'customers',
          fileName: fileNameBase,
          business,
          period,
          summary: {
            totalCustomers: customerReport.totalCustomers,
            newCustomers: customerReport.newCustomers,
            returningCustomers: customerReport.returningCustomers,
          },
          topCustomers: customerReport.topCustomers.map((c) => ({
            customerName: c.customerName,
            orderCount: c.orderCount,
            totalSpent: c.totalSpent,
            currency: 'MWK',
          })),
        });
        return;
      }

      toast.showWarning('No data found for the selected report');
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.showError('Failed to export report');
    }
  };

  const handleClear = () => {
    setGeneratedReport(null);
    setError(null);
  };

  return (
    <div>
      <div className="flex flex-col gap-4 mb-6 sm:mb-8">
        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Reports</h1>
        
        {/* Export Controls - Only show when report is generated */}
        {generatedReport && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExport} className="flex-1 sm:flex-none">
                <Download className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Export</span>
                <span className="sm:hidden">DL</span>
              </Button>
              <Button variant="outline" onClick={handleClear} className="flex-1 sm:flex-none">
                <span className="hidden sm:inline">Clear</span>
                <span className="sm:hidden">X</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Report Generator */}
      <div className="bg-card rounded-lg border border-border p-4 sm:p-6 mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-bold text-foreground mb-3 sm:mb-4">Generate Report</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-foreground mb-2">Report Type</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'sales', label: 'Sales Report', icon: TrendingUp },
                { value: 'products', label: 'Product Sales', icon: Package },
                { value: 'services', label: 'Service Bookings', icon: CalendarIcon },
                { value: 'customers', label: 'Customer Report', icon: Users },
              ].map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.value}
                    onClick={() => setReportType(type.value as ReportType)}
                    className={cn(
                      'p-3 sm:p-4 border rounded-lg text-left transition-colors',
                      reportType === type.value
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:bg-background-secondary'
                    )}
                  >
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5 mb-1 sm:mb-2 text-primary" />
                    <p className="text-xs sm:text-sm font-medium text-foreground">{type.label}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-foreground mb-2">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-foreground mb-2">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        </div>

        <Button onClick={handleGenerateReport} disabled={loading} isLoading={loading} className="w-full sm:w-auto">
          <FileText className="w-4 h-4 mr-2" />
          Generate Report
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-3 sm:p-4 bg-destructive/20 text-destructive rounded-lg text-sm sm:text-base">
          {error}
        </div>
      )}

      <div>
      {/* Sales Report */}
      {generatedReport === 'sales' && currentReport && (
        <div className="bg-card rounded-lg border border-border p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold text-foreground mb-3 sm:mb-4">Sales Report</h2>
          <p className="text-xs sm:text-sm text-text-secondary mb-4 sm:mb-6">
            Period: {formatDate(currentReport.period.start)} - {formatDate(currentReport.period.end)}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="p-3 sm:p-4 bg-background-secondary rounded-lg">
              <p className="text-xs sm:text-sm text-text-secondary mb-1">Total Revenue</p>
              <p className="text-xl sm:text-2xl font-bold text-foreground">
                {formatCurrency(currentReport.totalRevenue, 'MWK')}
              </p>
            </div>
            <div className="p-3 sm:p-4 bg-background-secondary rounded-lg">
              <p className="text-xs sm:text-sm text-text-secondary mb-1">Total Orders</p>
              <p className="text-xl sm:text-2xl font-bold text-foreground">{currentReport.orders.total}</p>
            </div>
            <div className="p-3 sm:p-4 bg-background-secondary rounded-lg">
              <p className="text-xs sm:text-sm text-text-secondary mb-1">Total Bookings</p>
              <p className="text-xl sm:text-2xl font-bold text-foreground">{currentReport.bookings.total}</p>
            </div>
            <div className="p-3 sm:p-4 bg-background-secondary rounded-lg">
              <p className="text-xs sm:text-sm text-text-secondary mb-1">Avg Order Value</p>
              <p className="text-xl sm:text-2xl font-bold text-foreground">
                {formatCurrency(currentReport.orders.averageOrderValue, 'MWK')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3">Orders by Status</h3>
              <div className="space-y-2">
                {Object.entries(currentReport.orders.byStatus).map(([status, count]) => (
                  <div key={status} className="flex justify-between text-xs sm:text-sm">
                    <span className="text-text-secondary capitalize">{status.replace('_', ' ')}</span>
                    <span className="text-foreground font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3">Bookings by Status</h3>
              <div className="space-y-2">
                {Object.entries(currentReport.bookings.byStatus).map(([status, count]) => (
                  <div key={status} className="flex justify-between text-xs sm:text-sm">
                    <span className="text-text-secondary capitalize">{status.replace('_', ' ')}</span>
                    <span className="text-foreground font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product Sales Report */}
      {generatedReport === 'products' && productSalesReport.length > 0 && (
        <div className="bg-card rounded-lg border border-border p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold text-foreground mb-3 sm:mb-4">Product Sales Report</h2>
          
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-background-secondary">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Product</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Units Sold</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Revenue</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Avg Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {productSalesReport.map((report) => (
                  <tr key={report.productId} className="hover:bg-background-secondary">
                    <td className="py-3 px-4 text-sm text-foreground">{report.productName}</td>
                    <td className="py-3 px-4 text-sm text-foreground">{report.unitsSold}</td>
                    <td className="py-3 px-4 text-sm font-medium text-foreground">
                      {formatCurrency(report.revenue, 'MWK')}
                    </td>
                    <td className="py-3 px-4 text-sm text-foreground">
                      {formatCurrency(report.averagePrice, 'MWK')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {productSalesReport.map((report) => (
              <div key={report.productId} className="bg-background-secondary rounded-lg p-4 border border-border">
                <h3 className="text-sm font-semibold text-foreground mb-3">{report.productName}</h3>
                <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
                  <div>
                    <p className="text-text-secondary mb-1">Units Sold</p>
                    <p className="text-foreground font-medium">{report.unitsSold}</p>
                  </div>
                  <div>
                    <p className="text-text-secondary mb-1">Avg Price</p>
                    <p className="text-foreground font-medium">{formatCurrency(report.averagePrice, 'MWK')}</p>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-border">
                    <p className="text-text-secondary mb-1">Revenue</p>
                    <p className="text-base font-bold text-foreground">{formatCurrency(report.revenue, 'MWK')}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Service Bookings Report */}
      {generatedReport === 'services' && serviceBookingsReport.length > 0 && (
        <div className="bg-card rounded-lg border border-border p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold text-foreground mb-3 sm:mb-4">Service Bookings Report</h2>
          
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-background-secondary">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Service</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Bookings</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Revenue</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Avg Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {serviceBookingsReport.map((report) => (
                  <tr key={report.serviceId} className="hover:bg-background-secondary">
                    <td className="py-3 px-4 text-sm text-foreground">{report.serviceName}</td>
                    <td className="py-3 px-4 text-sm text-foreground">{report.bookingsCount}</td>
                    <td className="py-3 px-4 text-sm font-medium text-foreground">
                      {formatCurrency(report.revenue, 'MWK')}
                    </td>
                    <td className="py-3 px-4 text-sm text-foreground">
                      {formatCurrency(report.averagePrice, 'MWK')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {serviceBookingsReport.map((report) => (
              <div key={report.serviceId} className="bg-background-secondary rounded-lg p-4 border border-border">
                <h3 className="text-sm font-semibold text-foreground mb-3">{report.serviceName}</h3>
                <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
                  <div>
                    <p className="text-text-secondary mb-1">Bookings</p>
                    <p className="text-foreground font-medium">{report.bookingsCount}</p>
                  </div>
                  <div>
                    <p className="text-text-secondary mb-1">Avg Price</p>
                    <p className="text-foreground font-medium">{formatCurrency(report.averagePrice, 'MWK')}</p>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-border">
                    <p className="text-text-secondary mb-1">Revenue</p>
                    <p className="text-base font-bold text-foreground">{formatCurrency(report.revenue, 'MWK')}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Customer Report */}
      {generatedReport === 'customers' && customerReport.topCustomers.length > 0 && (
        <div className="bg-card rounded-lg border border-border p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold text-foreground mb-3 sm:mb-4">Customer Report</h2>
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="p-3 sm:p-4 bg-background-secondary rounded-lg">
              <p className="text-xs sm:text-sm text-text-secondary mb-1">Total Customers</p>
              <p className="text-xl sm:text-2xl font-bold text-foreground">{customerReport.totalCustomers}</p>
            </div>
            <div className="p-3 sm:p-4 bg-background-secondary rounded-lg">
              <p className="text-xs sm:text-sm text-text-secondary mb-1">New Customers</p>
              <p className="text-xl sm:text-2xl font-bold text-foreground">{customerReport.newCustomers}</p>
            </div>
            <div className="p-3 sm:p-4 bg-background-secondary rounded-lg">
              <p className="text-xs sm:text-sm text-text-secondary mb-1">Returning Customers</p>
              <p className="text-xl sm:text-2xl font-bold text-foreground">{customerReport.returningCustomers}</p>
            </div>
          </div>

          <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">Top Customers</h3>
          
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-background-secondary">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Customer</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Orders</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Total Spent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {customerReport.topCustomers.map((customer) => (
                  <tr key={customer.customerId} className="hover:bg-background-secondary">
                    <td className="py-3 px-4 text-sm text-foreground">{customer.customerName}</td>
                    <td className="py-3 px-4 text-sm text-foreground">{customer.orderCount}</td>
                    <td className="py-3 px-4 text-sm font-medium text-foreground">
                      {formatCurrency(customer.totalSpent, 'MWK')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {customerReport.topCustomers.map((customer) => (
              <div key={customer.customerId} className="bg-background-secondary rounded-lg p-4 border border-border">
                <h4 className="text-sm font-semibold text-foreground mb-3">{customer.customerName}</h4>
                <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
                  <div>
                    <p className="text-text-secondary mb-1">Orders</p>
                    <p className="text-foreground font-medium">{customer.orderCount}</p>
                  </div>
                  <div>
                    <p className="text-text-secondary mb-1">Total Spent</p>
                    <p className="text-base font-bold text-foreground">{formatCurrency(customer.totalSpent, 'MWK')}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {generatedReport && !loading && !currentReport && productSalesReport.length === 0 && serviceBookingsReport.length === 0 && customerReport.topCustomers.length === 0 && (
        <div className="text-center py-8 sm:py-12 text-text-secondary">
          <FileText className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 opacity-50" />
          <p className="text-sm sm:text-base">No data found for the selected period</p>
        </div>
      )}
      </div>
    </div>
  );
}
