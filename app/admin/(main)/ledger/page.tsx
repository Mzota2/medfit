/**
 * Admin Ledger Page
 * Displays real-time ledger entries from Firestore
 */

'use client';

import React, { useState, useMemo } from 'react';
import { useLedgerEntries, useRealtimeLedgerEntries, useDerivedTransactions, useSettings } from '@/hooks';
import { exportLedgerPdf } from '@/lib/exports/exports';
import { Button, Loading, useToast } from '@/components/ui';
import { cn } from '@/lib/utils/cn';
import { formatCurrency, formatDate } from '@/lib/utils/formatting';
import { LedgerEntryType, LedgerEntryStatus, LedgerEntry } from '@/types/ledger';
import Link from 'next/link';
import { ExternalLink, AlertCircle, Download, X } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { useApp } from '@/contexts/AppContext';

// Helper to convert date safely
const getDate = (date: Date | string | Timestamp | undefined): Date => {
  if (!date) return new Date(0);
  if (date instanceof Date) return date;
  if (date instanceof Timestamp) return date.toDate();
  if (typeof date === 'object' && date !== null && 'toDate' in date && typeof (date as { toDate: () => Date }).toDate === 'function') {
    return (date as { toDate: () => Date }).toDate();
  }
  return new Date(date as string);
};

export default function AdminLedgerPage() {
  const { currentBusiness } = useApp();
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [typeFilter, setTypeFilter] = useState<LedgerEntryType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<LedgerEntryStatus | 'all'>('all');
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);
  const toast = useToast();

  // Handle export
  const handleExport = async () => {
    const fileName = `ledger-${dateRange}-${typeFilter === 'all' ? 'all' : typeFilter}-${statusFilter === 'all' ? 'all' : statusFilter}`;
    
    try {
      await exportLedgerPdf({
        entries: transactionsWithBalance,
        fileName,
        title: 'Ledger',
        business: currentBusiness || undefined,
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast.showError('Failed to export. Please try again.');
    }
  };

  // Check if ledger creation is enabled
  const { data: settings } = useSettings();
  const ledgerEnabled = settings?.ledger?.enabled ?? false;
  const isUsingDerivedData = !ledgerEnabled;

  // Calculate date range
  const dateRangeFilter = useMemo(() => {
    if (dateRange === 'all') return undefined;
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    return { startDate, endDate };
  }, [dateRange]);

  // Fetch ledger entries (only if enabled)
  const {
    data: ledgerEntries = [],
    isLoading: isLoadingLedger,
    error: ledgerError,
  } = useLedgerEntries({
    entryType: typeFilter !== 'all' ? typeFilter : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    startDate: dateRangeFilter?.startDate,
    endDate: dateRangeFilter?.endDate,
    limit: 1000,
    enabled: ledgerEnabled,
  });

  // Fetch derived transactions (only if ledger is disabled)
  const {
    data: derivedTransactions = [],
    isLoading: isLoadingDerived,
    error: derivedError,
  } = useDerivedTransactions({
    entryType: typeFilter !== 'all' ? typeFilter : undefined,
    startDate: dateRangeFilter?.startDate,
    endDate: dateRangeFilter?.endDate,
    limit: 1000,
    enabled: isUsingDerivedData,
  });

  // Real-time updates (only if ledger is enabled)
  useRealtimeLedgerEntries({
    entryType: typeFilter !== 'all' ? typeFilter : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    limit: 1000,
    enabled: ledgerEnabled,
  });

  // Combine data sources
  const isLoading = ledgerEnabled ? isLoadingLedger : isLoadingDerived;
  const error = ledgerEnabled ? ledgerError : derivedError;
  
  // Convert derived transactions to ledger-like format for display
  const allEntries = useMemo(() => {
    if (ledgerEnabled) {
      return ledgerEntries;
    } else {
      // Convert DerivedTransaction to LedgerEntry-like format for display
      return derivedTransactions.map((tx): LedgerEntry & { balance?: number; source?: 'order' | 'booking' } => {
        const createdAt = getDate(tx.createdAt);
        return {
          id: tx.id,
          entryType: tx.entryType,
          status: tx.status,
          amount: tx.amount,
          currency: tx.currency,
          orderId: tx.orderId,
          bookingId: tx.bookingId,
          paymentId: tx.paymentId,
          description: tx.description,
          createdAt,
          updatedAt: createdAt, // Use createdAt as updatedAt for derived transactions
          metadata: tx.metadata,
          businessId: '', // Not available in derived transactions
        };
      });
    }
  }, [ledgerEnabled, ledgerEntries, derivedTransactions]);

  // Calculate summary metrics
  const summary = useMemo(() => {
    const totalBalance = allEntries
      .filter(e => e.status === LedgerEntryStatus.CONFIRMED)
      .reduce((sum, entry) => sum + entry.amount, 0);
    
    const thisMonth = allEntries
      .filter(e => {
        if (e.status !== LedgerEntryStatus.CONFIRMED) return false;
        // Use createdAt for ledger entries (which already use payment date when available)
        const entryDate = getDate(e.createdAt);
        const now = new Date();
        return entryDate.getMonth() === now.getMonth() && entryDate.getFullYear() === now.getFullYear();
      })
      .reduce((sum, entry) => sum + entry.amount, 0);
    
    const pending = allEntries
      .filter(e => e.status === LedgerEntryStatus.PENDING)
      .reduce((sum, entry) => sum + entry.amount, 0);

    return { totalBalance, thisMonth, pending };
  }, [allEntries]);

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    return allEntries
      .filter(entry => {
        if (typeFilter !== 'all' && entry.entryType !== typeFilter) return false;
        if (statusFilter !== 'all' && entry.status !== statusFilter) return false;
        return true;
      })
      .sort((a, b) => {
        const aDate = getDate(a.createdAt);
        const bDate = getDate(b.createdAt);
        return bDate.getTime() - aDate.getTime();
      });
  }, [allEntries, typeFilter, statusFilter]);

  // Calculate running balance
  const transactionsWithBalance = useMemo(() => {
    return filteredTransactions.reduce<Array<typeof filteredTransactions[0] & { balance: number }>>((acc, entry) => {
      const previousBalance = acc.length > 0 ? acc[acc.length - 1].balance : 0;
      const balance = entry.status === LedgerEntryStatus.CONFIRMED 
        ? previousBalance + entry.amount
        : previousBalance;
      acc.push({
        ...entry,
        balance,
      });
      return acc;
    }, []);
  }, [filteredTransactions]);

  const getEntryTypeLabel = (type: LedgerEntryType) => {
    switch (type) {
      case LedgerEntryType.ORDER_SALE:
        return 'Order Sale';
      case LedgerEntryType.BOOKING_PAYMENT:
        return 'Booking Payment';
      case LedgerEntryType.REFUND:
        return 'Refund';
      case LedgerEntryType.FEE:
        return 'Fee';
      case LedgerEntryType.ADJUSTMENT:
        return 'Adjustment';
      default:
        return type;
    }
  };

  const getStatusColor = (status: LedgerEntryStatus) => {
    switch (status) {
      case LedgerEntryStatus.CONFIRMED:
        return 'bg-success/20 text-success';
      case LedgerEntryStatus.PENDING:
        return 'bg-warning/20 text-warning';
      case LedgerEntryStatus.REVERSED:
        return 'bg-destructive/20 text-destructive';
      default:
        return 'bg-background-secondary text-text-secondary';
    }
  };

  if (isLoading && allEntries.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loading size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Ledger</h1>
            <p className="text-sm text-muted-foreground">
              {filteredTransactions.length} entries found
            </p>
          </div>
          <div className="flex gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={filteredTransactions.length === 0}
              className="whitespace-nowrap"
            >
              <Download className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Export</span>
              <span className="sm:hidden">DL</span>
            </Button>
          </div>
        </div>
        <div className="p-4 bg-destructive/20 text-destructive rounded-lg">
          {error instanceof Error ? error.message : 'An error occurred while loading transaction data'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with title and export controls */}
      <div className="flex flex-col gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Ledger</h1>
          <p className="text-sm text-muted-foreground">
            {filteredTransactions.length} entries found
            {isUsingDerivedData && ' (derived from orders and bookings)'}
          </p>
        </div>
        <div className="flex gap-2 sm:justify-end">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={filteredTransactions.length === 0}
            className="whitespace-nowrap"
          >
            <Download className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Export</span>
            <span className="sm:hidden">DL</span>
          </Button>
        </div>
      </div>
      
      {/* Warning banner when using derived data */}
      {isUsingDerivedData && !isBannerDismissed && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-warning/20 border border-warning/50 rounded-lg flex items-start gap-2 sm:gap-3 relative">
          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-warning mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0 pr-6 sm:pr-8">
            <h3 className="text-sm sm:text-base font-semibold text-warning mb-1">Derived Transaction Data</h3>
            <p className="text-xs sm:text-sm text-text-secondary">
              Ledger creation is currently disabled in app settings. This page shows transaction information 
              derived from successful orders and bookings. This data is calculated from payment records and may not 
              include all transaction types.
            </p>
          </div>
          <button
            onClick={() => setIsBannerDismissed(true)}
            className="absolute top-3 right-3 p-1 text-warning hover:text-warning/80 hover:bg-warning/10 rounded transition-colors shrink-0"
            aria-label="Dismiss notification"
            title="Dismiss"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      )}

      {/* Main content */}
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-card rounded-lg p-4 sm:p-6 border border-border">
          <h3 className="text-xs sm:text-sm font-medium text-text-secondary mb-2">Total Balance</h3>
          <p className="text-2xl sm:text-3xl font-bold text-foreground">
            {formatCurrency(summary.totalBalance, 'MWK')}
          </p>
        </div>
        <div className="bg-card rounded-lg p-4 sm:p-6 border border-border">
          <h3 className="text-xs sm:text-sm font-medium text-text-secondary mb-2">This Month</h3>
          <p className={cn(
            'text-2xl sm:text-3xl font-bold',
            summary.thisMonth >= 0 ? 'text-success' : 'text-destructive'
          )}>
            {summary.thisMonth >= 0 ? '+' : ''}{formatCurrency(summary.thisMonth, 'MWK')}
          </p>
        </div>
        <div className="bg-card rounded-lg p-4 sm:p-6 border border-border">
          <h3 className="text-xs sm:text-sm font-medium text-text-secondary mb-2">Pending</h3>
          <p className="text-2xl sm:text-3xl font-bold text-warning">
            {formatCurrency(summary.pending, 'MWK')}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 flex-1 w-full">
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value as '7d' | '30d' | '90d' | 'all')}
            className="w-full px-3 sm:px-4 py-2 text-xs sm:text-sm bg-background-secondary text-foreground rounded-lg font-medium hover:bg-background-tertiary focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 90 Days</option>
          <option value="all">All Time</option>
        </select>
        
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as LedgerEntryType | 'all')}
            className="w-full px-3 sm:px-4 py-2 text-xs sm:text-sm bg-background-secondary text-foreground rounded-lg font-medium hover:bg-background-tertiary focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">All Types</option>
          <option value={LedgerEntryType.ORDER_SALE}>Order Sales</option>
          <option value={LedgerEntryType.BOOKING_PAYMENT}>Booking Payments</option>
          <option value={LedgerEntryType.REFUND}>Refunds</option>
          <option value={LedgerEntryType.FEE}>Fees</option>
          <option value={LedgerEntryType.ADJUSTMENT}>Adjustments</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as LedgerEntryStatus | 'all')}
            className="w-full px-3 sm:px-4 py-2 text-xs sm:text-sm bg-background-secondary text-foreground rounded-lg font-medium hover:bg-background-tertiary focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">All Statuses</option>
          <option value={LedgerEntryStatus.CONFIRMED}>Confirmed</option>
          <option value={LedgerEntryStatus.PENDING}>Pending</option>
          <option value={LedgerEntryStatus.REVERSED}>Reversed</option>
        </select>
        </div>

        <Button variant="outline" className="w-full sm:w-auto">
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Transactions Table - Desktop */}
      <div className="hidden md:block bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-background-secondary">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Entry ID</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Date</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Type</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Description</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Order/Booking</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Amount</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {transactionsWithBalance.map((entry) => {
                if (!entry.id) return null;
                const entryDate = getDate(entry.createdAt);
                
                return (
                  <tr key={entry.id} className="hover:bg-background-secondary transition-colors">
                    <td className="py-3 px-4">
                      <code className="text-sm text-foreground font-mono">{entry.id.substring(0, 12)}...</code>
                    </td>
                    <td className="py-3 px-4 text-sm text-text-secondary">
                      {formatDate(entryDate.toISOString())}
                    </td>
                    <td className="py-3 px-4 text-sm text-foreground">
                      {getEntryTypeLabel(entry.entryType)}
                    </td>
                    <td className="py-3 px-4 text-sm text-foreground">
                      {entry.description}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {entry.orderId && (
                        <Link
                          href={`/admin/orders?orderId=${entry.orderId}`}
                          className="text-primary hover:text-primary-hover flex items-center gap-1"
                        >
                          Order
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                      {entry.bookingId && (
                        <Link
                          href={`/admin/bookings?bookingId=${entry.bookingId}`}
                          className="text-primary hover:text-primary-hover flex items-center gap-1"
                        >
                          Booking
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                      {!entry.orderId && !entry.bookingId && (
                        <span className="text-text-secondary">N/A</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={cn('px-2 py-1 rounded-full text-xs font-medium', getStatusColor(entry.status))}>
                        {entry.status}
                      </span>
                    </td>
                    <td className={cn(
                      'py-3 px-4 text-sm font-medium',
                      entry.amount >= 0 ? 'text-success' : 'text-destructive'
                    )}>
                      {entry.amount >= 0 ? '+' : ''}{formatCurrency(entry.amount, entry.currency)}
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-foreground">
                      {formatCurrency(entry.balance, entry.currency)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transactions Cards - Mobile */}
      <div className="md:hidden space-y-4">
        {transactionsWithBalance.map((entry) => {
          if (!entry.id) return null;
          const entryDate = getDate(entry.createdAt);
          
          return (
            <div key={entry.id} className="bg-card rounded-lg border border-border p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={cn('px-2 py-1 rounded-full text-xs font-medium', getStatusColor(entry.status))}>
                      {entry.status}
                    </span>
                    <span className="text-xs text-text-secondary">
                      {getEntryTypeLabel(entry.entryType)}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-foreground mb-1 line-clamp-2">
                    {entry.description}
                  </p>
                  <code className="text-xs text-text-secondary font-mono">
                    {entry.id.substring(0, 12)}...
                  </code>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={cn(
                    'text-base font-bold',
                    entry.amount >= 0 ? 'text-success' : 'text-destructive'
                  )}>
                    {entry.amount >= 0 ? '+' : ''}{formatCurrency(entry.amount, entry.currency)}
                  </span>
                  <span className="text-xs text-text-secondary">Balance</span>
                  <span className="text-sm font-medium text-foreground">
                    {formatCurrency(entry.balance, entry.currency)}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2 pt-3 border-t border-border">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary">Date:</span>
                  <span className="text-foreground">{formatDate(entryDate.toISOString())}</span>
                </div>
                {(entry.orderId || entry.bookingId) && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-text-secondary">Link:</span>
                    {entry.orderId && (
                      <Link
                        href={`/admin/orders?orderId=${entry.orderId}`}
                        className="text-primary hover:text-primary-hover flex items-center gap-1"
                      >
                        <span>Order</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                    {entry.bookingId && (
                      <Link
                        href={`/admin/bookings?bookingId=${entry.bookingId}`}
                        className="text-primary hover:text-primary-hover flex items-center gap-1"
                      >
                        <span>Booking</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

        {filteredTransactions.length === 0 && !isLoading && (
          <div className="text-center py-8 sm:py-12 text-text-secondary">
            <p className="text-sm sm:text-base">No ledger entries found</p>
            <p className="text-xs sm:text-sm mt-2">Try adjusting your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}

