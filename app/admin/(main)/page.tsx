/**
 * Admin Dashboard
 * Real-time dashboard with Firebase data integration
 */


'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useApp } from '@/contexts/AppContext';
import { exportDashboardPdf } from '@/lib/exports/exports';
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
import { Loading, StatusBadge } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils/formatting';
import { cn } from '@/lib/utils/cn';
import { calculateTransactionFeeCost, DEFAULT_TRANSACTION_FEE_RATE } from '@/lib/utils/pricing';
import { Timestamp } from 'firebase/firestore';

// Helper to convert date safely
const getDate = (date: Date | string | Timestamp | { toDate?: () => Date } | undefined): Date => {
  if (!date) return new Date(0);
  if (date instanceof Date) return date;
  if (date instanceof Timestamp) return date.toDate();
  if (typeof date === 'object' && date !== null && 'toDate' in date && typeof (date as { toDate: () => Date }).toDate === 'function') {
    return (date as { toDate: () => Date }).toDate();
  }
  return new Date(date as string);
};
import {
  ShoppingCart,
  DollarSign,
  Package,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Settings,
  FileText,
  Calendar,
  AlertTriangle,
  Download,
  HelpCircle,
} from 'lucide-react';
import { OptimizedImage } from '@/components/ui';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { OrderStatus } from '@/types/order';
import { BookingStatus } from '@/types/booking';
import { useStoreType } from '@/hooks/useStoreType';
import { StoreTypeSelector } from '@/components/admin/StoreTypeSelector';
import { StoreTypeBanner } from '@/components/admin/StoreTypeBanner';
import { getStoreTypeLabel, getStoreTypeBadgeColor } from '@/lib/store-type/utils';

// const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

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

export default function AdminDashboardPage() {
  const router = useRouter();
  const { currentBusiness } = useApp();
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [showStoreTypeSelector, setShowStoreTypeSelector] = useState(false);
  const { storeType, isLoading: storeTypeLoading, hasProducts, hasServices } = useStoreType();

  // Fetch data with React Query
  const { data: orders = [], isLoading: ordersLoading } = useOrders({
    limit: 100,
    enabled: !!currentBusiness?.id,
  });
  const { data: bookings = [], isLoading: bookingsLoading } = useBookings({
    limit: 100,
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

  // Real-time updates
  // Real-time updates for admin dashboard (critical - admin needs immediate updates)
  useRealtimeOrders({ limit: 100, enabled: !!currentBusiness?.id });
  useRealtimeBookings({ limit: 100, enabled: !!currentBusiness?.id });
  useRealtimeProducts({ businessId: currentBusiness?.id, enabled: !!currentBusiness?.id });
  useRealtimeServices({ businessId: currentBusiness?.id, enabled: !!currentBusiness?.id });
  useRealtimeCustomers({ enabled: !!currentBusiness?.id });

  // Handle export
  const handleExport = async () => {
    const fileName = `dashboard-${dateRange}-${new Date().toISOString().split('T')[0]}`;
    
    try {
      const dateRangeLabel =
        dateRange === '7d'
          ? 'Last 7 Days'
          : dateRange === '30d'
            ? 'Last 30 Days'
            : dateRange === '90d'
              ? 'Last 90 Days'
              : 'All Time';

      const kpis = [
        { label: 'Net Revenue', value: formatCurrency(metrics?.totalRevenue || 0, 'MWK') },
        { label: 'Transaction Fees', value: formatCurrency(metrics?.transactionFees || 0, 'MWK') },
        ...(hasProducts ? [{ label: 'Total Orders', value: `${metrics?.totalOrders || 0}` }] : []),
        ...(hasServices ? [{ label: 'Total Bookings', value: `${metrics?.totalBookings || 0}` }] : []),
        { label: 'Total Customers', value: `${metrics?.totalCustomers || 0}` },
      ];

      const recent = recentItems.map((item) => ({
        type: item.type,
        number: item.number,
        status: item.status,
        amount: formatCurrency(item.amount, item.currency),
        date: formatDate(item.date.toISOString()),
      }));

      const top = topItemsData.map((t) => ({
        name: t.name,
        sales: `${t.sales}`,
        revenue: formatCurrency(t.revenue, 'MWK'),
      }));

      await exportDashboardPdf({
        fileName,
        business: currentBusiness || undefined,
        dateRangeLabel,
        metrics: kpis,
        recentItems: recent,
        topItems: top,
      });
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  // Calculate metrics from data
  const metrics = useMemo(() => {
    const now = new Date();
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    
    // Current period revenue
    const currentPeriodStart = new Date(now);
    currentPeriodStart.setDate(currentPeriodStart.getDate() - days);
    
    // Only count revenue-generating orders/bookings with confirmed payment
    // Use payment amount and payment date (paidAt) to match ledger calculations
    // Calculate gross revenue (what customers paid) and transaction fees (costs)
    const currentGrossRevenue = orders
      .filter((o) => {
        if (!ORDER_REVENUE_STATUSES.includes(o.status) || !o.payment) return false;
        // Use payment date (paidAt) if available, otherwise use createdAt
        const transactionDate = o.payment.paidAt
          ? getDate(o.payment.paidAt)
          : getDate(o.createdAt);
        return transactionDate >= currentPeriodStart;
      })
      .reduce((sum, o) => sum + (o.payment?.amount || o.pricing.total || 0), 0) +
      bookings
        .filter((b) => {
          if (!BOOKING_REVENUE_STATUSES.includes(b.status) || !b.payment) return false;
          // Use payment date (paidAt) if available, otherwise use createdAt
          const transactionDate = b.payment.paidAt
            ? getDate(b.payment.paidAt)
            : getDate(b.createdAt);
          return transactionDate >= currentPeriodStart;
        })
        .reduce((sum, b) => sum + (b.payment?.amount || b.pricing.total || 0), 0);

    // Calculate transaction fees as costs (3% of gross revenue by default)
    const currentTransactionFees = calculateTransactionFeeCost(currentGrossRevenue, DEFAULT_TRANSACTION_FEE_RATE);
    const currentRevenue = currentGrossRevenue - currentTransactionFees; // Net revenue

    // Previous period revenue
    const previousPeriodStart = new Date(now);
    previousPeriodStart.setDate(previousPeriodStart.getDate() - (days * 2));
    const previousPeriodEnd = new Date(now);
    previousPeriodEnd.setDate(previousPeriodEnd.getDate() - days);
    
    // Only count revenue-generating orders/bookings with confirmed payment
    // Use payment amount and payment date (paidAt) to match ledger calculations
    // Calculate gross revenue (what customers paid) and transaction fees (costs)
    const previousGrossRevenue = orders
      .filter((o) => {
        if (!ORDER_REVENUE_STATUSES.includes(o.status) || !o.payment) return false;
        // Use payment date (paidAt) if available, otherwise use createdAt
        const transactionDate = o.payment.paidAt
          ? getDate(o.payment.paidAt)
          : getDate(o.createdAt);
        return transactionDate >= previousPeriodStart && transactionDate < previousPeriodEnd;
      })
      .reduce((sum, o) => sum + (o.payment?.amount || o.pricing.total || 0), 0) +
      bookings
        .filter((b) => {
          if (!BOOKING_REVENUE_STATUSES.includes(b.status) || !b.payment) return false;
          // Use payment date (paidAt) if available, otherwise use createdAt
          const transactionDate = b.payment.paidAt
            ? getDate(b.payment.paidAt)
            : getDate(b.createdAt);
          return transactionDate >= previousPeriodStart && transactionDate < previousPeriodEnd;
        })
        .reduce((sum, b) => sum + (b.payment?.amount || b.pricing.total || 0), 0);

    // Calculate transaction fees as costs (3% of gross revenue by default)
    const previousTransactionFees = calculateTransactionFeeCost(previousGrossRevenue, DEFAULT_TRANSACTION_FEE_RATE);
    const previousRevenue = previousGrossRevenue - previousTransactionFees; // Net revenue

    // Calculate revenue growth percentage
    const revenueGrowth = previousRevenue > 0
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
      : currentRevenue > 0 ? 100 : 0;

    const totalOrders = orders.length;
    const totalBookings = bookings.length;
    const totalProducts = Array.isArray(products) ? products.length : 0;
    const totalServices = Array.isArray(services) ? services.length : 0;
    const totalCustomers = customers.length;

    // Calculate low stock and out of stock products
    const stockCounts = products.reduce<{ lowStockProducts: number; outOfStockProducts: number }>(
      (acc, p) => {
        if (p.type !== 'product') return acc;
        
        const inventory = 'inventory' in p && p.inventory && typeof p.inventory === 'object' 
          ? p.inventory as { quantity?: number; available?: number; trackInventory?: boolean }
          : null;
        
        if (inventory?.trackInventory === false) return acc;
        
        const stock = typeof inventory?.available === 'number' 
          ? inventory.available 
          : typeof inventory?.quantity === 'number' 
            ? inventory.quantity 
            : 0;
        
        if (stock === 0) {
          acc.outOfStockProducts++;
        } else if (stock > 0 && stock <= 10) {
          acc.lowStockProducts++;
        }
        
        return acc;
      }, 
      { lowStockProducts: 0, outOfStockProducts: 0 }
    );
    
    const { lowStockProducts, outOfStockProducts } = stockCounts;

    // Calculate today's orders and bookings
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayOrders = orders.filter((o) => {
      const orderDate = o.createdAt instanceof Date ? o.createdAt : o.createdAt?.toDate?.() || new Date(0);
      return orderDate >= todayStart;
    }).length;

    const todayBookings = bookings.filter((b) => {
      const bookingDate = b.createdAt instanceof Date ? b.createdAt : b.createdAt?.toDate?.() || new Date(0);
      return bookingDate >= todayStart;
    }).length;

    // Calculate this month's orders and bookings
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthOrders = orders.filter((o) => {
      const orderDate = o.createdAt instanceof Date ? o.createdAt : o.createdAt?.toDate?.() || new Date(0);
      return orderDate >= monthStart;
    }).length;

    const monthBookings = bookings.filter((b) => {
      const bookingDate = b.createdAt instanceof Date ? b.createdAt : b.createdAt?.toDate?.() || new Date(0);
      return bookingDate >= monthStart;
    }).length;

    // Calculate pending bookings
    const pendingBookings = bookings.filter((b) => {
      return b.status === BookingStatus.PENDING || b.status === BookingStatus.CONFIRMED;
    }).length;

    // Calculate average order/booking values (using net revenue)
    const revenueOrders = orders.filter((o) => ORDER_REVENUE_STATUSES.includes(o.status) && o.payment);
    const revenueBookings = bookings.filter((b) => BOOKING_REVENUE_STATUSES.includes(b.status) && b.payment);
    
    const totalRevenueOrders = revenueOrders.length;
    const totalRevenueBookings = revenueBookings.length;

    return {
      totalRevenue: currentRevenue, // Net revenue (after transaction fees)
      grossRevenue: currentGrossRevenue, // Gross revenue (what customers paid)
      transactionFees: currentTransactionFees, // Transaction fees (costs)
      totalOrders,
      totalBookings,
      totalProducts,
      totalServices,
      totalCustomers,
      averageOrderValue: totalRevenueOrders > 0 
        ? revenueOrders.reduce((sum, o) => {
            const grossAmount = o.payment?.amount || o.pricing.total || 0;
            const fees = calculateTransactionFeeCost(grossAmount, DEFAULT_TRANSACTION_FEE_RATE);
            return sum + (grossAmount - fees);
          }, 0) / totalRevenueOrders
        : 0,
      averageBookingValue: totalRevenueBookings > 0
        ? revenueBookings.reduce((sum, b) => {
            const grossAmount = b.payment?.amount || b.pricing.total || 0;
            const fees = calculateTransactionFeeCost(grossAmount, DEFAULT_TRANSACTION_FEE_RATE);
            return sum + (grossAmount - fees);
          }, 0) / totalRevenueBookings
        : 0,
      revenueGrowth,
      lowStockProducts,
      outOfStockProducts,
      todayOrders,
      monthOrders,
      todayBookings,
      monthBookings,
      pendingBookings,
    };
  }, [orders, bookings, products, services, customers, dateRange]);

  const loading = ordersLoading || bookingsLoading || productsLoading || servicesLoading || customersLoading;

  // Get recent orders and bookings based on store type
  type RecentItem = {
    id: string;
    type: 'order' | 'booking';
    number: string;
    status: string;
    amount: number;
    currency: string;
    date: Date;
    link: string;
  };

  const recentItems = useMemo(() => {
    const items: RecentItem[] = [];

    // Add orders if business has products
    if (hasProducts) {
      orders
        .filter((order) => ORDER_REVENUE_STATUSES.includes(order.status))
        .forEach((order) => {
          const date = order.createdAt instanceof Date ? order.createdAt : order.createdAt?.toDate?.() || new Date(0);
          items.push({
            id: order.id || '',
            type: 'order',
            number: order.orderNumber || order.id?.substring(0, 8) || 'N/A',
            status: order.status || 'pending',
            amount: order.pricing.total || 0,
            currency: order.pricing.currency || 'MWK',
            date,
            link: `/admin/orders/${order.id}`,
          });
        });
    }

    // Add bookings if business has services
    if (hasServices) {
      bookings
        .filter((booking) => BOOKING_REVENUE_STATUSES.includes(booking.status))
        .forEach((booking) => {
          const date = booking.createdAt instanceof Date ? booking.createdAt : booking.createdAt?.toDate?.() || new Date(0);
          items.push({
            id: booking.id || '',
            type: 'booking',
            number: booking.bookingNumber || booking.id?.substring(0, 8) || 'N/A',
            status: booking.status || 'pending',
            amount: booking.pricing.total || 0,
            currency: booking.pricing.currency || 'MWK',
            date,
            link: `/admin/bookings/${booking.id}`,
          });
        });
    }

    // Sort by date (most recent first) and take top 10
    return items
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 10);
  }, [orders, bookings, hasProducts, hasServices]);

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

      // Only count revenue-generating orders/bookings with confirmed payment
      // Use payment amount and payment date (paidAt) to match ledger calculations
      const dayOrders = orders.filter((order) => {
        if (!ORDER_REVENUE_STATUSES.includes(order.status) || !order.payment) return false;
        // Use payment date (paidAt) if available, otherwise use createdAt
        const transactionDate = order.payment.paidAt
          ? getDate(order.payment.paidAt)
          : getDate(order.createdAt);
        return transactionDate >= dateStart && transactionDate < dateEnd;
      });

      const dayBookings = bookings.filter((booking) => {
        if (!BOOKING_REVENUE_STATUSES.includes(booking.status) || !booking.payment) return false;
        // Use payment date (paidAt) if available, otherwise use createdAt
        const transactionDate = booking.payment.paidAt
          ? getDate(booking.payment.paidAt)
          : getDate(booking.createdAt);
        return transactionDate >= dateStart && transactionDate < dateEnd;
      });

      const grossRevenue = dayOrders.reduce((sum, o) => sum + (o.payment?.amount || o.pricing.total || 0), 0) +
        dayBookings.reduce((sum, b) => sum + (b.payment?.amount || b.pricing.total || 0), 0);
      
      // Calculate transaction fees and net revenue
      const transactionFees = calculateTransactionFeeCost(grossRevenue, DEFAULT_TRANSACTION_FEE_RATE);
      const revenue = grossRevenue - transactionFees; // Net revenue

      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue, // Net revenue (after transaction fees)
        orders: dayOrders.length,
        bookings: dayBookings.length,
      });
    }

    return data;
  }, [orders, bookings, dateRange]);

  // Calculate top products/services
  const topItemsData = useMemo(() => {
    const itemSales: Record<string, { name: string; sales: number; revenue: number; type: 'product' | 'service' }> = {};

    // Only process orders if business has products
    if (hasProducts) {
      orders.forEach((order) => {
        if (!ORDER_REVENUE_STATUSES.includes(order.status)) return;
        if (!order.items || !Array.isArray(order.items)) return; // Safety check
        order.items.forEach((item) => {
          if (!item.productId) return; // Skip items without productId
          if (!itemSales[item.productId]) {
            itemSales[item.productId] = {
              name: item.productName || 'Unknown Product',
              sales: 0,
              revenue: 0,
              type: 'product',
            };
          }
          itemSales[item.productId].sales += item.quantity || 0;
          itemSales[item.productId].revenue += item.subtotal || 0;
        });
      });
    }

    // Only process bookings if business has services
    if (hasServices) {
      bookings.forEach((booking) => {
        if (!BOOKING_REVENUE_STATUSES.includes(booking.status) || !booking.serviceId) return;
        if (!itemSales[booking.serviceId]) {
          itemSales[booking.serviceId] = {
            name: booking.serviceName || 'Service',
            sales: 0,
            revenue: 0,
            type: 'service',
          };
        }
        itemSales[booking.serviceId].sales += 1;
        itemSales[booking.serviceId].revenue += booking.pricing?.total || 0;
      });
    }

    // Filter items based on business type
    const filteredItems = Object.values(itemSales).filter(item => 
      (hasProducts && item.type === 'product') || (hasServices && item.type === 'service')
    );

    return filteredItems
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map((item) => {
        const name = item.name || 'Unknown';
        return {
          name: name.length > 20 ? name.substring(0, 20) + '...' : name,
          revenue: item.revenue || 0,
          sales: item.sales || 0,
          // Include type for conditional rendering if needed
          type: item.type
        };
      });
  }, [orders, bookings]);

  // Calculate earnings over time
  const earningsChartData = useMemo(() => {
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    const data: { date: string; income: number; expenses: number; profit: number }[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dateEnd = new Date(dateStart);
      dateEnd.setDate(dateEnd.getDate() + 1);

      const dayOrders = orders.filter((order) => {
        if (!order.payment?.paidAt) return false;
        const orderDate = order.createdAt instanceof Date ? order.createdAt : order.createdAt?.toDate?.() || new Date(0);
        return orderDate >= dateStart && orderDate < dateEnd;
      });

      const dayBookings = bookings.filter((booking) => {
        if (!booking.payment?.paidAt) return false;
        const bookingDate = booking.createdAt instanceof Date ? booking.createdAt : booking.createdAt?.toDate?.() || new Date(0);
        return bookingDate >= dateStart && bookingDate < dateEnd;
      });

      const grossIncome = dayOrders.reduce((sum, o) => sum + (o.payment?.amount || o.pricing.total || 0), 0) +
        dayBookings.reduce((sum, b) => sum + (b.payment?.amount || b.pricing.total || 0), 0);
      
      // Calculate transaction fees as expenses
      const transactionFees = calculateTransactionFeeCost(grossIncome, DEFAULT_TRANSACTION_FEE_RATE);
      const income = grossIncome - transactionFees; // Net income (after transaction fees)
      const expenses = transactionFees; // Transaction fees are the costs
      const profit = income; // Profit = net income (gross - transaction fees)

      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        income,
        expenses,
        profit,
      });
    }

    return data;
  }, [orders, bookings, dateRange]);

  // Order status distribution
  // const orderStatusData = useMemo(() => {
  //   const statusCounts: Record<string, number> = {};
  //   orders.forEach((order) => {
  //     const status = order.status || 'unknown';
  //     statusCounts[status] = (statusCounts[status] || 0) + 1;
  //   });
  //   return Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
  // }, [orders]);

  // Show store type selector if not set
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!storeTypeLoading && !storeType) {
      setShowStoreTypeSelector(true);
    }
  }, [storeType, storeTypeLoading]);

  if (loading || storeTypeLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loading size="lg" />
      </div>
    );
  }

  // Debug: Log the first few items to check their status values
  console.log('Recent items with status:', recentItems.map(item => ({
    id: item.id,
    type: item.type,
    status: item.status,
    number: item.number,
    amount: item.amount,
    currency: item.currency,
    date: item.date.toISOString()
  })));

  return (
    <div>
      {showStoreTypeSelector && (
        <StoreTypeSelector
          onComplete={() => setShowStoreTypeSelector(false)}
        />
      )}

      <div className="flex flex-col gap-4 mb-6 sm:mb-8">
        {/* Title and Description */}
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Overview of your business performance
          </p>
        </div>
        
        {/* Export Controls */}
        <div className="flex gap-2 sm:justify-end">
          <button
            onClick={handleExport}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
          >
            <Download className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Export</span>
            <span className="sm:hidden">DL</span>
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="overflow-x-auto mb-6 sm:mb-8 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <div className="flex gap-3 sm:gap-4 md:gap-6 min-w-max">
        {/* Today's Orders - Only show if business has products */}
      {hasProducts && (
        <div className="bg-card rounded-lg p-4 sm:p-5 md:p-6 border border-border shrink-0 min-w-[200px] sm:min-w-[220px]">
          <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
            <h3 className="text-xs sm:text-sm font-medium text-text-secondary">Today&apos;s Orders</h3>
            <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 text-primary shrink-0" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-foreground mb-1.5 sm:mb-2 whitespace-nowrap">
            {metrics?.todayOrders || 0}
          </p>
          <div className="flex items-center gap-1 min-w-0">
            {metrics && metrics.todayOrders > 0 ? (
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-success shrink-0" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-text-secondary shrink-0" />
            )}
            <p className="text-xs sm:text-sm text-text-secondary">
              {metrics?.monthOrders || 0} this month
            </p>
          </div>
        </div>
      )}

        {/* Today's Bookings - Only show if business has services */}
        {hasServices && (
          <div className="bg-card rounded-lg p-4 sm:p-5 md:p-6 border border-border shrink-0 min-w-[200px] sm:min-w-[220px]">
            <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
              <h3 className="text-xs sm:text-sm font-medium text-text-secondary">Today&apos;s Bookings</h3>
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500 shrink-0" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-foreground mb-1.5 sm:mb-2 whitespace-nowrap">
              {metrics?.todayBookings || 0}
            </p>
            <div className="flex items-center gap-1 min-w-0">
              {metrics && metrics.todayBookings > 0 ? (
                <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-success shrink-0" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-text-secondary shrink-0" />
              )}
              <p className="text-xs sm:text-sm text-text-secondary">
                {metrics?.monthBookings || 0} this month
              </p>
            </div>
          </div>
        )}

        {/* Total Revenue (Net) */}
        <div className="bg-card rounded-lg p-4 sm:p-5 md:p-6 border border-border shrink-0 min-w-[200px] sm:min-w-[240px]">
          <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
            <h3 className="text-xs sm:text-sm font-medium text-text-secondary">Net Revenue</h3>
            <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-primary shrink-0" />
          </div>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-1.5 sm:mb-2 whitespace-nowrap">
            {formatCurrency(metrics?.totalRevenue || 0, 'MWK')}
          </p>
          <div className="flex items-center gap-1 min-w-0">
            {metrics && metrics.revenueGrowth >= 0 ? (
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-success shrink-0" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-destructive shrink-0" />
            )}
            <p className={cn('text-xs sm:text-sm', metrics && metrics.revenueGrowth >= 0 ? 'text-success' : 'text-destructive')}>
              {metrics && metrics.revenueGrowth >= 0 ? '+' : ''}
              {(metrics?.revenueGrowth ?? 0).toFixed(1)}%
            </p>
          </div>
          {metrics && metrics.transactionFees !== undefined && (
            <p className="text-xs text-text-secondary mt-1">
              After {formatCurrency(metrics.transactionFees, 'MWK')} in fees
            </p>
          )}
        </div>

        {/* Transaction Fees (Costs) */}
        <div className="bg-card rounded-lg p-4 sm:p-5 md:p-6 border border-border shrink-0 min-w-[200px] sm:min-w-[240px]">
          <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
            <h3 className="text-xs sm:text-sm font-medium text-text-secondary">Transaction Fees</h3>
            <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6 text-destructive shrink-0" />
          </div>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold text-destructive mb-1.5 sm:mb-2 whitespace-nowrap">
            {formatCurrency(metrics?.transactionFees || 0, 'MWK')}
          </p>
          {metrics && metrics.grossRevenue !== undefined && metrics.transactionFees !== undefined && (
            <p className="text-xs text-text-secondary">
              {((metrics.transactionFees / metrics.grossRevenue) * 100).toFixed(1)}% of gross revenue
            </p>
          )}
        </div>

        {/* Low Stock Items - Only show if business has products */}
        {hasProducts && (
          <div className="bg-card rounded-lg p-4 sm:p-5 md:p-6 border border-border shrink-0 min-w-[200px] sm:min-w-[220px]">
            <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
              <h3 className="text-xs sm:text-sm font-medium text-text-secondary">Low Stock Items</h3>
              <Package className="w-5 h-5 sm:w-6 sm:h-6 text-warning shrink-0" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-foreground mb-1.5 sm:mb-2 whitespace-nowrap">
              {metrics?.lowStockProducts || 0}
            </p>
            {metrics && metrics.lowStockProducts > 0 && (
              <div className="flex items-center gap-1 min-w-0">
                <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-warning shrink-0" />
                <p className="text-xs sm:text-sm text-warning">Action required</p>
              </div>
            )}
          </div>
        )}

        {/* Pending Bookings - Only show if business has services */}
        {hasServices && (
          <div className="bg-card rounded-lg p-4 sm:p-5 md:p-6 border border-border shrink-0 min-w-[200px] sm:min-w-[220px]">
            <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
              <h3 className="text-xs sm:text-sm font-medium text-text-secondary">Pending Bookings</h3>
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-info shrink-0" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-foreground mb-1.5 sm:mb-2 whitespace-nowrap">
              {metrics?.pendingBookings || 0}
            </p>
            <p className="text-xs sm:text-sm text-text-secondary">
              {metrics?.totalBookings || 0} total bookings
            </p>
          </div>
        )}
        </div>
      </div>

      {/* Quick Actions & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="bg-card rounded-lg p-4 sm:p-5 md:p-6 border border-border">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-foreground">Quick Actions</h2>
            <Link
              href="/admin/guide"
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm text-primary hover:text-primary-hover hover:bg-primary/10 rounded-lg transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Guide</span>
            </Link>
          </div>
          <div className="space-y-2 sm:space-y-3">
            {hasProducts && (
              <Link
                href="/admin/products"
                className="w-full flex items-center justify-between p-2.5 sm:p-3 bg-background-secondary hover:bg-background-tertiary rounded-lg transition-colors text-left"
              >
                <span className="text-sm sm:text-base text-foreground">Manage Products</span>
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-text-muted shrink-0" />
              </Link>
            )}
            {hasServices && (
              <Link
                href="/admin/services"
                className="w-full flex items-center justify-between p-2.5 sm:p-3 bg-background-secondary hover:bg-background-tertiary rounded-lg transition-colors text-left"
              >
                <span className="text-sm sm:text-base text-foreground">Manage Services</span>
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-text-muted shrink-0" />
              </Link>
            )}
            {hasProducts && (
              <Link
                href="/admin/orders"
                className="w-full flex items-center justify-between p-2.5 sm:p-3 bg-background-secondary hover:bg-background-tertiary rounded-lg transition-colors text-left"
              >
                <span className="text-sm sm:text-base text-foreground">View All Orders</span>
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-text-muted shrink-0" />
              </Link>
            )}
            {hasServices && (
              <Link
                href="/admin/bookings"
                className="w-full flex items-center justify-between p-2.5 sm:p-3 bg-background-secondary hover:bg-background-tertiary rounded-lg transition-colors text-left"
              >
                <span className="text-sm sm:text-base text-foreground">View All Bookings</span>
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-text-muted shrink-0" />
              </Link>
            )}
            <Link
              href="/admin/settings"
              className="w-full flex items-center justify-between p-2.5 sm:p-3 bg-background-secondary hover:bg-background-tertiary rounded-lg transition-colors text-left"
            >
              <span className="text-sm sm:text-base text-foreground">Configure Settings</span>
              <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-text-muted shrink-0" />
            </Link>
            <Link
              href="/admin/ledger"
              className="w-full flex items-center justify-between p-2.5 sm:p-3 bg-background-secondary hover:bg-background-tertiary rounded-lg transition-colors text-left"
            >
              <span className="text-sm sm:text-base text-foreground">Access Ledger</span>
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-text-muted shrink-0" />
            </Link>
            <Link
              href="/admin/analytics"
              className="w-full flex items-center justify-between p-2.5 sm:p-3 bg-background-secondary hover:bg-background-tertiary rounded-lg transition-colors text-left"
            >
              <span className="text-sm sm:text-base text-foreground">View Analytics</span>
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-text-muted shrink-0" />
            </Link>
          </div>
        </div>

        {/* Recent Orders & Bookings */}
        <div className="bg-card rounded-lg p-4 sm:p-5 md:p-6 border border-border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-3 sm:mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-foreground">
              {hasProducts && hasServices
                ? 'Recent Orders & Bookings'
                : hasProducts
                ? 'Recent Orders'
                : 'Recent Bookings'}
            </h2>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {hasProducts && (
                <Link href="/admin/orders" className="text-xs sm:text-sm text-primary hover:text-primary-hover">
                  View all orders
                </Link>
              )}
              {hasServices && (
                <Link href="/admin/bookings" className="text-xs sm:text-sm text-primary hover:text-primary-hover">
                  View all bookings
                </Link>
              )}
            </div>
          </div>
          <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
            {recentItems.length > 0 ? (
              <table className="w-full min-w-[600px] sm:min-w-0">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 sm:px-3 text-xs sm:text-sm font-medium text-text-secondary">Type</th>
                    <th className="text-left py-2 px-2 sm:px-3 text-xs sm:text-sm font-medium text-text-secondary">ID</th>
                    <th className="text-left py-2 px-2 sm:px-3 text-xs sm:text-sm font-medium text-text-secondary">Status</th>
                    <th className="text-left py-2 px-2 sm:px-3 text-xs sm:text-sm font-medium text-text-secondary">Amount</th>
                    <th className="text-left py-2 px-2 sm:px-3 text-xs sm:text-sm font-medium text-text-secondary">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentItems.map((item) => (
                    <tr 
                      key={`${item.type}-${item.id}`} 
                      className="border-b border-border hover:bg-background-secondary transition-colors group cursor-pointer"
                      onClick={() => router.push(item.link)}
                    >
                      <td className="py-2 sm:py-3 px-2 sm:px-3">
                        <span className={cn(
                          'px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs rounded-full font-medium inline-flex items-center',
                          item.type === 'order' 
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300' 
                            : 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300'
                        )}>
                          {item.type === 'order' ? 'Order' : 'Booking'}
                        </span>
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm font-medium">
                        <span className="text-foreground group-hover:text-primary transition-colors">
                          {item.number}
                        </span>
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-3">
                        <StatusBadge 
                          status={item.status} 
                          variant="badge"
                          className="text-xs"
                          showIcon={false}
                        />
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm font-medium text-foreground">
                        {formatCurrency(item.amount, item.currency)}
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm text-text-secondary">
                        <div className="flex items-center justify-between">
                          <span>{formatDate(item.date.toISOString())}</span>
                          <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-6 sm:py-8 text-text-secondary">
                <ShoppingCart className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm sm:text-base">
                  {hasProducts && hasServices
                    ? 'No recent orders or bookings'
                    : hasProducts
                    ? 'No recent orders'
                    : 'No recent bookings'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Items Needing Restock - Only show if business has products and there are low stock items */}
      {hasProducts && metrics?.lowStockProducts > 0 && (
        <div className="bg-card rounded-lg border border-warning/20 p-3 sm:p-4 md:p-6 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-4">
            <div className="space-y-1">
              <h2 className="text-base sm:text-lg md:text-xl font-semibold text-foreground flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-warning flex-shrink-0" />
                <span>Items Needing Attention <span className="text-sm font-normal">({metrics.lowStockProducts + (metrics.outOfStockProducts || 0)})</span></span>
              </h2>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {metrics.outOfStockProducts > 0 && (
                  <span className="inline-flex items-center gap-1 whitespace-nowrap">
                    <span className="w-2 h-2 rounded-full bg-destructive"></span>
                    {metrics.outOfStockProducts} Out of Stock
                  </span>
                )}
                {metrics.lowStockProducts > 0 && (
                  <span className="inline-flex items-center gap-1 whitespace-nowrap">
                    <span className="w-2 h-2 rounded-full bg-warning"></span>
                    {metrics.lowStockProducts} Low Stock
                  </span>
                )}
              </div>
            </div>
            <Link 
              href="/admin/products" 
              className="text-xs sm:text-sm font-medium text-primary hover:underline flex items-center gap-1 justify-end sm:justify-start self-end sm:self-auto"
            >
              View All Products
              <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
            </Link>
          </div>
          
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <div className="min-w-[600px] sm:min-w-0">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-text-secondary border-b border-border">
                    <th className="pb-2 pl-2 sm:pl-0 font-medium">Product</th>
                    <th className="pb-2 font-medium text-right">Available</th>
                    <th className="pb-2 font-medium text-right">In Stock</th>
                    <th className="pb-2 pr-2 sm:pr-0 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {products
                    .filter((p) => {
                      if (p.type !== 'product') return false;
                      const inventory = 'inventory' in p && p.inventory && typeof p.inventory === 'object' 
                        ? p.inventory as { quantity?: number; available?: number; trackInventory?: boolean }
                        : null;
                      
                      if (inventory?.trackInventory === false) return false;
                      
                      const available = typeof inventory?.available === 'number' 
                        ? inventory.available 
                        : typeof inventory?.quantity === 'number' 
                          ? inventory.quantity 
                          : 0;
                      
                      const quantity = typeof inventory?.quantity === 'number' ? inventory.quantity : 0;
                      
                      // Show items that are out of stock or low stock
                      return available <= 10 || quantity === 0;
                    })
                    .sort((a, b) => {
                      // Sort by status (out of stock first) then by available quantity
                      const getAvailable = (p: unknown) => {
                        if (!p || typeof p !== 'object') return 0;
                        if (!('inventory' in p)) return 0;
                        const inv = (p as { inventory?: unknown }).inventory;
                        if (!inv || typeof inv !== 'object') return 0;
                        const available = (inv as { available?: unknown }).available;
                        const quantity = (inv as { quantity?: unknown }).quantity;
                        if (typeof available === 'number') return available;
                        if (typeof quantity === 'number') return quantity;
                        return 0;
                      };
                      const aAvailable = getAvailable(a);
                      const bAvailable = getAvailable(b);
                      
                      // Out of stock items first
                      if (aAvailable <= 0 && bAvailable > 0) return -1;
                      if (aAvailable > 0 && bAvailable <= 0) return 1;
                      
                      // Then by available quantity (ascending)
                      return aAvailable - bAvailable;
                    })
                    .slice(0, 8) // Show top 8 items (increased from 5 to show more critical items)
                    .map((product) => {
                      const inventory = 'inventory' in product && product.inventory && typeof product.inventory === 'object' 
                        ? product.inventory as { quantity?: number; available?: number; trackInventory?: boolean }
                        : null;
                      
                      const available = typeof inventory?.available === 'number' 
                        ? inventory.available 
                        : typeof inventory?.quantity === 'number' 
                          ? inventory.quantity 
                          : 0;
                          
                      const inStock = typeof inventory?.quantity === 'number' ? inventory.quantity : 0;
                      const isOutOfStock = available <= 0;
                      const isCritical = !isOutOfStock && available <= 3;
                      const isLow = !isOutOfStock && available <= 10;
                      
                      return (
                        <tr key={product.id} className="text-sm hover:bg-muted/30 transition-colors">
                          <td className="py-3 pl-2 sm:pl-0 pr-1">
                            <Link 
                              href={`/admin/products/${product.id}/edit`}
                              className={cn(
                                "font-medium hover:underline flex items-center gap-2 group",
                                isOutOfStock ? "text-destructive" : "text-foreground hover:text-primary"
                              )}
                            >
                              {product.images?.[0] ? (
                                <div className="relative w-6 h-6 sm:w-8 sm:h-8 rounded-md overflow-hidden bg-muted flex-shrink-0">
                                  <OptimizedImage
                                    src={product.images?.[0]?.url || ''}
                                    alt={product?.name || 'Product image'}
                                    fill
                                    sizes="(max-width: 640px) 24px, 32px"
                                    className="object-cover"
                                    priority={false}
                                    context="listing"
                                  />
                                </div>
                              ) : (
                                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-md bg-muted/50 flex items-center justify-center flex-shrink-0">
                                  <Package className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
                                </div>
                              )}
                              <span className="truncate max-w-[120px] sm:max-w-[180px] md:max-w-xs">
                                {product.name}
                              </span>
                              {isOutOfStock && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive whitespace-nowrap">
                                  OUT OF STOCK
                                </span>
                              )}
                            </Link>
                          </td>
                          <td className="py-3 text-right px-2">
                            <span className={cn(
                              "font-medium whitespace-nowrap",
                              isOutOfStock 
                                ? "text-destructive" 
                                : isCritical 
                                  ? "text-destructive" 
                                  : "text-warning"
                            )}>
                              {available} {available === 1 ? 'unit' : 'units'}
                            </span>
                          </td>
                          <td className="py-3 text-right px-2 text-muted-foreground whitespace-nowrap">
                            {inStock} {inStock === 1 ? 'unit' : 'units'}
                          </td>
                          <td className="py-3 pr-2 sm:pr-0 text-right">
                            <span className={cn(
                              "inline-flex items-center justify-center px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium whitespace-nowrap",
                              isOutOfStock
                                ? "bg-destructive/10 text-destructive"
                                : isCritical 
                                  ? "bg-destructive/10 text-destructive" 
                                  : "bg-warning/10 text-warning"
                            )}>
                              {isOutOfStock ? 'Out of Stock' : isCritical ? 'Critical' : 'Low Stock'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {/* Revenue over time */}
        <div className="bg-card rounded-lg p-3 sm:p-4 md:p-6 border border-border overflow-hidden">
          <h2 className="text-base sm:text-lg md:text-xl font-bold text-foreground mb-2 sm:mb-3 md:mb-4">Net Revenue Over Time</h2>
          <div className="w-full" style={{ minHeight: '200px', height: '200px' }}>
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
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorRevenue)"
                name="Net Revenue (MWK)"
              />
            </AreaChart>
          </ResponsiveContainer>
          </div>
        </div>

        {/* Orders & Bookings over time - Dynamic based on business type */}
        {hasProducts || hasServices ? (
          <div className="bg-card rounded-lg p-3 sm:p-4 md:p-6 border border-border overflow-hidden">
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-foreground mb-2 sm:mb-3 md:mb-4">
              {hasProducts && hasServices 
                ? 'Orders & Bookings Over Time' 
                : hasProducts 
                  ? 'Orders Over Time' 
                  : 'Bookings Over Time'}
            </h2>
            <div className="w-full" style={{ minHeight: '200px', height: '200px' }}>
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
                      stroke="#10b981" 
                      strokeWidth={2} 
                      name="Orders" 
                      hide={!hasProducts}
                    />
                  )}
                  {hasServices && (
                    <Line 
                      type="monotone" 
                      dataKey="bookings" 
                      stroke="#f59e0b" 
                      strokeWidth={2} 
                      name="Bookings" 
                      hide={!hasServices}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : null}
      </div>

    
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Net Earnings Over Time */}
        <div className="bg-card rounded-lg p-3 sm:p-4 md:p-6 border border-border overflow-hidden">
          <h2 className="text-base sm:text-lg md:text-xl font-bold text-foreground mb-2 sm:mb-3 md:mb-4">Net Earnings Over Time</h2>
          <div className="w-full" style={{ minHeight: '200px', height: '200px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={earningsChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
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
                dataKey="income"
                stroke="#10b981"
                fillOpacity={1}
                fill="url(#colorIncome)"
                name="Net Income (MWK)"
              />
              <Area
                type="monotone"
                dataKey="expenses"
                stroke="#ef4444"
                fillOpacity={1}
                fill="url(#colorExpenses)"
                name="Transaction Fees (MWK)"
              />
              <Line type="monotone" dataKey="profit" stroke="#3b82f6" strokeWidth={2} name="Profit (MWK)" />
            </AreaChart>
          </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products & Services - Dynamic based on business type */}
        {(hasProducts || hasServices) && (
          <div className="bg-card rounded-lg p-3 sm:p-4 md:p-6 border border-border overflow-hidden">
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-foreground mb-2 sm:mb-3 md:mb-4">
              {hasProducts && hasServices 
                ? 'Top Products & Services' 
                : hasProducts 
                  ? 'Top Products' 
                  : 'Top Services'}
            </h2>
            {topItemsData.length > 0 ? (
              <div className="w-full" style={{ minHeight: '200px', height: '200px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={topItemsData} 
                    layout="vertical" 
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
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
                    <Bar 
                      dataKey="revenue" 
                      fill={hasProducts && hasServices ? "#3b82f6" : hasProducts ? "#10b981" : "#f59e0b"} 
                      name={hasProducts && hasServices ? "Revenue (MWK)" : hasProducts ? "Product Revenue" : "Service Revenue"} 
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-text-secondary">
                <p className="text-xs sm:text-sm md:text-base">
                  {hasProducts && hasServices 
                    ? 'No sales data available for products or services' 
                    : hasProducts 
                      ? 'No product sales data available' 
                      : 'No service booking data available'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
