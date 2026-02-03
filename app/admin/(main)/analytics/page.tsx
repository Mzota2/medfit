/**
 * Admin Analytics Dashboard
 * Real-time analytics generated from collections (not stored)
 */


'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import {
  useOrders,
  useBookings,
  useProducts,
  useServices,
  useCustomers,
  useRealtimeOrders,
  useRealtimeBookings,
  useRealtimeProducts,
  useRealtimeServices,
  useRealtimeCustomers,
} from '@/hooks';
import { Loading, Button } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useSettings } from '@/hooks/useSettings';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Calendar, Users, AlertTriangle, Download } from 'lucide-react';
import { exportAnalyticsPdf } from '@/lib/exports/exports';
import { formatCurrency } from '@/lib/utils/formatting';
import { cn } from '@/lib/utils/cn';
import { calculateTransactionFeeCost, DEFAULT_TRANSACTION_FEE_RATE } from '@/lib/utils/pricing';
import { OrderStatus } from '@/types/order';
import { BookingStatus } from '@/types/booking';
import { ItemStatus } from '@/types/item';
import { useStoreType } from '@/hooks/useStoreType';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// Revenue-generating statuses (all statuses that represent confirmed payment)
const ORDER_REVENUE_STATUSES = [
  OrderStatus.PAID,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
  OrderStatus.COMPLETED,
];

const BOOKING_REVENUE_STATUSES = [
  BookingStatus.PAID,
  BookingStatus.CONFIRMED,
  BookingStatus.COMPLETED,
];

// Helper to convert date safely
const getDate = (date: Date | string | { toDate?: () => Date } | undefined): Date => {
  if (!date) return new Date(0);
  if (date instanceof Date) return date;
  if (typeof date === 'object' && 'toDate' in date && date.toDate) return date.toDate();
  return new Date(date as string);
};

export default function AdminAnalyticsPage() {
  const { currentBusiness } = useApp();
  const { data: settings } = useSettings();
  const { hasProducts, hasServices } = useStoreType();
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');
  const toast = useToast();

  // Handle export
  const handleExport = async () => {
    const fileName = `analytics-${dateRange}-${new Date().toISOString().split('T')[0]}`;

    try {
      const dateRangeLabel = dateRange === '7d' ? 'Last 7 Days' : dateRange === '30d' ? 'Last 30 Days' : 'Last 90 Days';

      const kpis = [
        { label: 'Net Revenue', value: formatCurrency(metrics.totalRevenue, 'MWK') },
        { label: 'Gross Revenue', value: formatCurrency(metrics.grossRevenue || 0, 'MWK') },
        { label: 'Transaction Fees', value: formatCurrency(metrics.transactionFees || 0, 'MWK') },
        { label: 'Revenue Growth', value: `${metrics.revenueGrowth.toFixed(1)}%` },
        ...(hasProducts ? [{ label: 'Total Orders', value: `${metrics.totalOrders}` }] : []),
        ...(hasServices ? [{ label: 'Total Bookings', value: `${metrics.totalBookings}` }] : []),
        { label: 'Total Customers', value: `${metrics.totalCustomers}` },
        ...(hasProducts ? [{ label: 'Avg Order Value', value: formatCurrency(metrics.averageOrderValue, 'MWK') }] : []),
        ...(hasServices ? [{ label: 'Avg Booking Value', value: formatCurrency(metrics.averageBookingValue, 'MWK') }] : []),
      ];

      const topItems = topItemsData.map((t) => ({
        name: t.name,
        sales: `${t.sales}`,
        revenue: formatCurrency(t.revenue, 'MWK'),
      }));

      const combinedStatuses = [
        ...(statusDistribution.orders || []).map((s) => ({ status: `Order: ${s.name}`, count: `${s.value}` })),
        ...(statusDistribution.bookings || []).map((s) => ({ status: `Booking: ${s.name}`, count: `${s.value}` })),
      ];

      await exportAnalyticsPdf({
        fileName,
        business: currentBusiness || undefined,
        dateRangeLabel,
        metrics: kpis,
        topItems,
        statusDistribution: combinedStatuses,
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast.showError('Failed to export analytics. Please try again.');
    }
  };
  
  // Get pagination settings
  const loadStrategy = settings?.performance?.analyticsLoadStrategy ?? 'paginated';
  const pageSize = settings?.performance?.analyticsPageSize ?? 50;

  // Determine if we should use limits
  const useLimits = loadStrategy !== 'all';

  // Fetch data with pagination
  const { data: orders = [], isLoading: ordersLoading, error: ordersError } = useOrders({
    enabled: !!currentBusiness?.id,
  });

  const { data: bookings = [], isLoading: bookingsLoading, error: bookingsError } = useBookings({
    enabled: !!currentBusiness?.id,
  });

  const { data: products = [], isLoading: productsLoading } = useProducts({
    businessId: currentBusiness?.id,
    enabled: !!currentBusiness?.id,
  });

  const { data: services = [], isLoading: servicesLoading } = useServices({
    businessId: currentBusiness?.id,
    enabled: !!currentBusiness?.id,
  });

  const { data: customers = [], isLoading: customersLoading } = useCustomers({
    enabled: !!currentBusiness?.id,
  });

  // Real-time updates for analytics (critical - admin needs immediate updates)
  useRealtimeOrders({ enabled: !!currentBusiness?.id });
  useRealtimeBookings({ enabled: !!currentBusiness?.id });
  useRealtimeProducts({ businessId: currentBusiness?.id, enabled: !!currentBusiness?.id });
  useRealtimeServices({ businessId: currentBusiness?.id, enabled: !!currentBusiness?.id });
  useRealtimeCustomers({ enabled: !!currentBusiness?.id });

  const isLoading = ordersLoading || bookingsLoading || productsLoading || servicesLoading || customersLoading;
  const error = ordersError || bookingsError;

  // Calculate metrics
  const metrics = useMemo(() => {
    const now = new Date();
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    
    // Current period revenue
    const currentPeriodStart = new Date(now);
    currentPeriodStart.setDate(currentPeriodStart.getDate() - days);
    
    // Only count revenue-generating orders/bookings with confirmed payment
    // Use payment amount and payment date (paidAt) to match ledger calculations
    // Calculate gross revenue (what customers paid) and transaction fees (costs)
    const currentGrossRevenue = 
      (hasProducts ? orders
        .filter((o) => {
          if (!ORDER_REVENUE_STATUSES.includes(o.status) || !o.payment) return false;
          // Use payment date (paidAt) if available, otherwise use createdAt
          const transactionDate = o.payment.paidAt
            ? getDate(o.payment.paidAt)
            : getDate(o.createdAt);
          return transactionDate >= currentPeriodStart;
        })
        .reduce((sum, o) => sum + (o.payment?.amount || o.pricing.total || 0), 0) : 0) +
      (hasServices ? bookings
        .filter((b) => {
          if (!BOOKING_REVENUE_STATUSES.includes(b.status) || !b.payment) return false;
          // Use payment date (paidAt) if available, otherwise use createdAt
          const transactionDate = b.payment.paidAt
            ? getDate(b.payment.paidAt)
            : getDate(b.createdAt);
          return transactionDate >= currentPeriodStart;
        })
        .reduce((sum, b) => sum + (b.payment?.amount || b.pricing.total || 0), 0) : 0);
        
    // Calculate transaction fees (costs)
    const currentTransactionFees = calculateTransactionFeeCost(currentGrossRevenue, DEFAULT_TRANSACTION_FEE_RATE);
    
    // Net revenue (what the business actually earns after fees)
    const currentRevenue = currentGrossRevenue - currentTransactionFees;
    
    // Previous period for comparison
    const previousPeriodStart = new Date(currentPeriodStart);
    previousPeriodStart.setDate(previousPeriodStart.getDate() - days);
    
    const previousRevenue = 
      (hasProducts ? orders
        .filter((o) => {
          if (!ORDER_REVENUE_STATUSES.includes(o.status) || !o.payment) return false;
          const transactionDate = o.payment.paidAt
            ? getDate(o.payment.paidAt)
            : getDate(o.createdAt);
          return transactionDate >= previousPeriodStart && transactionDate < currentPeriodStart;
        })
        .reduce((sum, o) => sum + (o.payment?.amount || o.pricing.total || 0), 0) : 0) +
      (hasServices ? bookings
        .filter((b) => {
          if (!BOOKING_REVENUE_STATUSES.includes(b.status) || !b.payment) return false;
          const transactionDate = b.payment.paidAt
            ? getDate(b.payment.paidAt)
            : getDate(b.createdAt);
          return transactionDate >= previousPeriodStart && transactionDate < currentPeriodStart;
        })
        .reduce((sum, b) => sum + (b.payment?.amount || b.pricing.total || 0), 0) : 0);
    
    // Calculate growth percentage
    const revenueGrowth = previousRevenue > 0 
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 
      : currentRevenue > 0 ? 100 : 0;
    
    // Other metrics
    const totalOrders = hasProducts ? orders.length : 0;
    const totalBookings = hasServices ? bookings.length : 0;
    const totalCustomers = customers.length;
    const activeProducts = Array.isArray(products) ? products.filter((p) => {
      return typeof p === 'object' && p !== null && 'status' in p && (p as { status: unknown }).status === ItemStatus.ACTIVE;
    }).length : 0;
    const activeServices = Array.isArray(services) ? services.filter((s) => {
      return typeof s === 'object' && s !== null && 'status' in s && (s as { status: unknown }).status === ItemStatus.ACTIVE;
    }).length : 0;

    // Calculate average order value (using net revenue)
    const revenueOrders = orders.filter(o => ORDER_REVENUE_STATUSES.includes(o.status) && o.payment);
    const averageOrderValue = revenueOrders.length > 0
      ? revenueOrders.reduce((sum, o) => {
          const grossAmount = o.payment?.amount || o.pricing?.total || 0;
          const fees = calculateTransactionFeeCost(grossAmount, DEFAULT_TRANSACTION_FEE_RATE);
          return sum + (grossAmount - fees);
        }, 0) / revenueOrders.length
      : 0;

    // Calculate average booking value (using net revenue)
    const revenueBookings = bookings.filter(b => BOOKING_REVENUE_STATUSES.includes(b.status) && b.payment);
    const averageBookingValue = revenueBookings.length > 0
      ? revenueBookings.reduce((sum, b) => {
          const grossAmount = b.payment?.amount || b.pricing?.total || 0;
          const fees = calculateTransactionFeeCost(grossAmount, DEFAULT_TRANSACTION_FEE_RATE);
          return sum + (grossAmount - fees);
        }, 0) / revenueBookings.length
      : 0;

    return {
      totalRevenue: currentRevenue, // Net revenue (after transaction fees)
      grossRevenue: currentGrossRevenue, // Gross revenue (what customers paid)
      transactionFees: currentTransactionFees, // Transaction fees (costs)
      previousRevenue,
      revenueGrowth,
      totalOrders,
      totalBookings,
      totalCustomers,
      activeProducts,
      activeServices,
      averageOrderValue,
      averageBookingValue,
    };
  }, [orders, bookings, products, services, customers, dateRange]);

  // Calculate chart data for revenue over time
  const revenueChartData = useMemo(() => {
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    const data: { date: string; revenue: number; orders: number; bookings: number }[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dateEnd = new Date(dateStart);
      dateEnd.setDate(dateEnd.getDate() + 1);

      // Only process orders if business has products
      const dayOrders = hasProducts ? orders.filter((order) => {
        if (!ORDER_REVENUE_STATUSES.includes(order.status)) return false;
        // Use payment date (paidAt) if available, otherwise use createdAt
        const transactionDate = order.payment?.paidAt
          ? getDate(order.payment.paidAt)
          : getDate(order.createdAt);
        return transactionDate >= dateStart && transactionDate < dateEnd;
      }) : [];

      // Only process bookings if business has services
      const dayBookings = hasServices ? bookings.filter((booking) => {
        if (!BOOKING_REVENUE_STATUSES.includes(booking.status)) return false;
        // Use payment date (paidAt) if available, otherwise use createdAt
        const transactionDate = booking.payment?.paidAt
          ? getDate(booking.payment.paidAt)
          : getDate(booking.createdAt);
        return transactionDate >= dateStart && transactionDate < dateEnd;
      }) : [];

      // Calculate gross revenue from orders and bookings based on business type
      const ordersRevenue = hasProducts 
        ? dayOrders.reduce((sum, o) => sum + (o.payment?.amount || o.pricing?.total || 0), 0) 
        : 0;
      
      const bookingsRevenue = hasServices 
        ? dayBookings.reduce((sum, b) => sum + (b.payment?.amount || b.pricing?.total || 0), 0) 
        : 0;
      
      const grossRevenue = ordersRevenue + bookingsRevenue;
      
      // Calculate transaction fees and net revenue
      const transactionFees = calculateTransactionFeeCost(grossRevenue, DEFAULT_TRANSACTION_FEE_RATE);
      const revenue = grossRevenue - transactionFees; // Net revenue

      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue, // Net revenue (after transaction fees)
        orders: hasProducts ? dayOrders.length : 0,
        bookings: hasServices ? dayBookings.length : 0,
      });
    }

    return data;
  }, [orders, bookings, dateRange, hasProducts, hasServices]);

  // Calculate top products/services
  const topItemsData = useMemo(() => {
    const itemSales: Record<string, { name: string; sales: number; revenue: number; type: 'product' | 'service' }> = {};

    // Only process orders if business has products
    if (hasProducts) {
      orders.forEach((order) => {
        if (!ORDER_REVENUE_STATUSES.includes(order.status) || !order.payment) return;
        if (!order.items || !Array.isArray(order.items)) return;
        const grossAmount = order.payment?.amount || order.pricing?.total || 0;
        const transactionFees = calculateTransactionFeeCost(grossAmount, DEFAULT_TRANSACTION_FEE_RATE);
        const netAmount = grossAmount - transactionFees;
        // Distribute net revenue proportionally across items
        const totalSubtotal = order.items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
        const revenueRatio = totalSubtotal > 0 ? netAmount / totalSubtotal : 0;
        
        order.items.forEach((item) => {
          if (!item.productId) return;
          if (!itemSales[item.productId]) {
            itemSales[item.productId] = {
              name: item.productName || 'Product',
              sales: 0,
              revenue: 0,
              type: 'product',
            };
          }
          itemSales[item.productId].sales += item.quantity || 0;
          itemSales[item.productId].revenue += (item.subtotal || 0) * revenueRatio;
        });
      });
    }

    // Only process bookings if business has services
    if (hasServices) {
      bookings.forEach((booking) => {
        if (!BOOKING_REVENUE_STATUSES.includes(booking.status) || !booking.serviceId || !booking.payment) return;
        if (!itemSales[booking.serviceId]) {
          itemSales[booking.serviceId] = {
            name: booking.serviceName || 'Service',
            sales: 0,
            revenue: 0,
            type: 'service',
          };
        }
        itemSales[booking.serviceId].sales += 1;
        // Calculate net revenue (after transaction fees)
        const grossAmount = booking.payment?.amount || booking.pricing?.total || 0;
        const transactionFees = calculateTransactionFeeCost(grossAmount, DEFAULT_TRANSACTION_FEE_RATE);
        itemSales[booking.serviceId].revenue += grossAmount - transactionFees;
      });
    }

    // Filter items based on business type
    const filteredItems = Object.values(itemSales).filter(item => 
      (hasProducts && item.type === 'product') || (hasServices && item.type === 'service')
    );

    return filteredItems
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map((item) => {
        const name = item.name || 'Unknown';
        return {
          name: name.length > 25 ? name.substring(0, 25) + '...' : name,
          revenue: item.revenue || 0,
          sales: item.sales || 0,
          type: item.type
        };
      });
  }, [orders, bookings, hasProducts, hasServices]);

  // Calculate status distribution
  const statusDistribution = useMemo(() => {
    const orderStatusCounts: Record<string, number> = {};
    const bookingStatusCounts: Record<string, number> = {};

    if (hasProducts) {
      orders.forEach((order) => {
        orderStatusCounts[order.status] = (orderStatusCounts[order.status] || 0) + 1;
      });
    }

    if (hasServices) {
      bookings.forEach((booking) => {
        bookingStatusCounts[booking.status] = (bookingStatusCounts[booking.status] || 0) + 1;
      });
    }

    return {
      orders: Object.entries(orderStatusCounts).map(([name, value]) => ({ name, value })),
      bookings: Object.entries(bookingStatusCounts).map(([name, value]) => ({ name, value })),
    };
  }, [orders, bookings, hasProducts, hasServices]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loading size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <AlertTriangle className="w-10 h-10 sm:w-12 sm:h-12 text-error mx-auto mb-3 sm:mb-4" />
          <h2 className="text-lg sm:text-xl font-bold text-foreground mb-2">Error Loading Analytics</h2>
          <p className="text-sm sm:text-base text-text-secondary">
            {error instanceof Error ? error.message : 'An error occurred while loading analytics data'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6">
      
      <div className="flex flex-col gap-4 sm:gap-6">
        {/* Title and Description */}
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Analytics Dashboard</h1>
          <p className="text-xs sm:text-sm lg:text-base text-text-secondary mt-1">
            Real-time analytics from your data
          </p>
        </div>

        {/* Controls Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Date Range Buttons */}
          <div className="flex gap-2 overflow-x-auto">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={cn(
                  'px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0',
                  dateRange === range
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background-secondary text-foreground hover:bg-background-tertiary'
                )}
              >
                {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>

          {/* Export Controls */}
          <div className="flex gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={handleExport}
              className="whitespace-nowrap"
            >
              <Download className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Export</span>
              <span className="sm:hidden">DL</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <div className="flex gap-3 sm:gap-4 min-w-max">
          {/* Net Revenue Card - Always shown */}
          <div className="bg-card rounded-lg border border-border p-4 sm:p-6 shrink-0 min-w-[200px] sm:min-w-[220px]">
            <div className="flex items-center justify-between mb-2 gap-2">
              <span className="text-xs sm:text-sm text-text-secondary">Net Revenue</span>
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
            </div>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground whitespace-nowrap">{formatCurrency(metrics.totalRevenue, 'MWK')}</p>
            <div className="flex items-center gap-1 mt-2">
              {metrics.revenueGrowth >= 0 ? (
                <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-success shrink-0" />
              ) : (
                <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4 text-destructive shrink-0" />
              )}
              <span className={cn('text-xs sm:text-sm', metrics.revenueGrowth >= 0 ? 'text-success' : 'text-destructive')}>
                {metrics.revenueGrowth >= 0 ? '+' : ''}{metrics.revenueGrowth.toFixed(1)}%
              </span>
            </div>
            {metrics.transactionFees !== undefined && (
              <p className="text-xs text-text-secondary mt-1">
                After {formatCurrency(metrics.transactionFees, 'MWK')} in fees
              </p>
            )}
          </div>

          {/* Transaction Fees Card - Always shown */}
          <div className="bg-card rounded-lg border border-border p-4 sm:p-6 shrink-0 min-w-[200px] sm:min-w-[220px]">
            <div className="flex items-center justify-between mb-2 gap-2">
              <span className="text-xs sm:text-sm text-text-secondary">Transaction Fees</span>
              <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-destructive shrink-0" />
            </div>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-destructive whitespace-nowrap">{formatCurrency(metrics.transactionFees || 0, 'MWK')}</p>
            {metrics.grossRevenue !== undefined && metrics.transactionFees !== undefined && (
              <p className="text-xs text-text-secondary mt-2">
                {((metrics.transactionFees / metrics.grossRevenue) * 100).toFixed(1)}% of gross revenue
              </p>
            )}
          </div>

          {/* Total Orders Card - Only show if business has products */}
          {hasProducts && (
            <div className="bg-card rounded-lg border border-border p-4 sm:p-6 shrink-0 min-w-[200px] sm:min-w-[220px]">
              <div className="flex items-center justify-between mb-2 gap-2">
                <span className="text-xs sm:text-sm text-text-secondary">Total Orders</span>
                <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
              </div>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground whitespace-nowrap">{metrics.totalOrders}</p>
              <p className="text-xs sm:text-sm text-text-secondary mt-2">
                Avg: {formatCurrency(metrics.averageOrderValue, 'MWK')}
              </p>
            </div>
          )}

          {/* Total Bookings Card - Only show if business has services */}
          {hasServices && (
            <div className="bg-card rounded-lg border border-border p-4 sm:p-6 shrink-0 min-w-[200px] sm:min-w-[220px]">
              <div className="flex items-center justify-between mb-2 gap-2">
                <span className="text-xs sm:text-sm text-text-secondary">Total Bookings</span>
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
              </div>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground whitespace-nowrap">{metrics.totalBookings}</p>
              <p className="text-xs sm:text-sm text-text-secondary mt-2">
                Avg: {formatCurrency(metrics.averageBookingValue, 'MWK')}
              </p>
            </div>
          )}

          {/* Total Customers Card - Always shown */}
          <div className="bg-card rounded-lg border border-border p-4 sm:p-6 shrink-0 min-w-[200px] sm:min-w-[220px]">
            <div className="flex items-center justify-between mb-2 gap-2">
              <span className="text-xs sm:text-sm text-text-secondary">Total Customers</span>
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
            </div>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground whitespace-nowrap">{metrics.totalCustomers}</p>
            <p className="text-xs sm:text-sm text-text-secondary mt-2">
              {metrics.activeProducts} {hasProducts ? 'products' : ''} 
              {hasProducts && hasServices ? ', ' : ''}
              {hasServices ? `${metrics.activeServices} services` : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Revenue over time */}
        <div className="bg-card rounded-lg p-4 sm:p-6 border border-border overflow-hidden">
          <h2 className="text-lg sm:text-xl font-bold text-foreground mb-3 sm:mb-4">Net Revenue Over Time</h2>
          <div className="w-full" style={{ minHeight: '250px', height: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="date" 
                  stroke="#9ca3af" 
                  tick={{ fontSize: 10 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  stroke="#9ca3af" 
                  tick={{ fontSize: 10 }}
                  width={60}
                  tickFormatter={(value) => {
                    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
                    return value.toString();
                  }}
                />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: '1px solid #374151', 
                    borderRadius: '8px',
                    fontSize: '12px',
                    padding: '8px'
                  }}
                  labelStyle={{ color: '#f3f4f6', fontSize: '12px' }}
                  formatter={(value: number) => formatCurrency(value, 'MWK')}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                  iconSize={12}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#6366f1"
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                  name="Net Revenue (MWK)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Orders & Bookings over time */}
        <div className="bg-card rounded-lg p-4 sm:p-6 border border-border overflow-hidden">
          <h2 className="text-lg sm:text-xl font-bold text-foreground mb-3 sm:mb-4">Orders & Bookings Over Time</h2>
          <div className="w-full" style={{ minHeight: '250px', height: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="date" 
                  stroke="#9ca3af" 
                  tick={{ fontSize: 10 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  stroke="#9ca3af" 
                  tick={{ fontSize: 10 }}
                  width={60}
                />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: '1px solid #374151', 
                    borderRadius: '8px',
                    fontSize: '12px',
                    padding: '8px'
                  }}
                  labelStyle={{ color: '#f3f4f6', fontSize: '12px' }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                  iconSize={12}
                />
                {hasProducts && (
                  <Line 
                    type="monotone" 
                    dataKey="orders" 
                    name="Orders" 
                    stroke="#10b981" 
                    strokeWidth={2} 
                    dot={false} 
                  />
                )}
                {hasServices && (
                  <Line 
                    type="monotone" 
                    dataKey="bookings" 
                    name="Bookings" 
                    stroke="#f59e0b" 
                    strokeWidth={2} 
                    dot={false} 
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products & Services */}
        <div className="bg-card rounded-lg p-4 sm:p-6 border border-border overflow-hidden">
          <h2 className="text-lg sm:text-xl font-bold text-foreground mb-3 sm:mb-4">Top Products & Services</h2>
          {topItemsData.length > 0 ? (
            <div className="w-full" style={{ minHeight: '250px', height: '250px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topItemsData} layout="vertical" margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    type="number" 
                    stroke="#9ca3af" 
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => {
                      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                      if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
                      return value.toString();
                    }}
                  />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    stroke="#9ca3af" 
                    tick={{ fontSize: 10 }}
                    width={80}
                  />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151', 
                      borderRadius: '8px',
                      fontSize: '12px',
                      padding: '8px'
                    }}
                    labelStyle={{ color: '#f3f4f6', fontSize: '12px' }}
                    formatter={(value: number) => formatCurrency(value, 'MWK')}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                    iconSize={12}
                  />
                  <Bar dataKey="revenue" fill="#3b82f6" name="Revenue (MWK)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-text-secondary">
              <p className="text-sm sm:text-base">No sales data available</p>
            </div>
          )}
        </div>

        {/* Order Status Distribution */}
        <div className="bg-card rounded-lg p-4 sm:p-6 border border-border overflow-hidden">
          <h2 className="text-lg sm:text-xl font-bold text-foreground mb-3 sm:mb-4">Order Status Distribution</h2>
          {statusDistribution.orders.length > 0 ? (
            <div className="w-full" style={{ minHeight: '250px', height: '250px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                  <Pie
                    data={statusDistribution.orders}
                    cx="50%"
                    cy="45%"
                    labelLine={false}
                    label={({ percent }) => {
                      // Only show label if percentage is significant (>5%)
                      if (percent < 0.05) return '';
                      return `${(percent * 100).toFixed(0)}%`;
                    }}
                    outerRadius={50}
                    innerRadius={0}
                    fill="#8884d8"
                    dataKey="value"
                    style={{ fontSize: '9px' }}
                  >
                    {statusDistribution.orders.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151', 
                      borderRadius: '8px',
                      fontSize: '11px',
                      padding: '6px'
                    }}
                    labelStyle={{ color: '#f3f4f6', fontSize: '11px' }}
                    formatter={(value: number, name: string) => [
                      `${value} (${((value / statusDistribution.orders.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)}%)`,
                      name
                    ]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}
                    iconSize={8}
                    formatter={(value) => {
                      const entry = statusDistribution.orders.find(item => item.name === value);
                      const total = statusDistribution.orders.reduce((sum, item) => sum + item.value, 0);
                      const percent = entry ? ((entry.value / total) * 100).toFixed(1) : '0';
                      return `${value} (${percent}%)`;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-text-secondary">
              <p className="text-sm sm:text-base">No order data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Pagination Warning (if paginated mode) */}
      {useLimits && loadStrategy === 'paginated' && (
        <div className="bg-warning/10 border border-warning/20 rounded-lg p-3 sm:p-4">
          <div className="flex items-start gap-2 sm:gap-3">
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-warning mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm sm:text-base font-medium text-foreground mb-1">Pagination Enabled</h3>
              <p className="text-xs sm:text-sm text-text-secondary">
                Analytics are showing limited data ({pageSize} records per collection) to reduce costs. 
                For complete analytics, switch to &quot;Load All&quot; mode in Settings → Cost Control → Performance.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
