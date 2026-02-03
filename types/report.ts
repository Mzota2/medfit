/**
 * Report types based on the design
 * Reports are stored in Firebase and can be generated on-demand
 */

import { BaseDocument } from './common';

/**
 * Report type/period
 */
export enum ReportType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  CUSTOM = 'custom',
}

/**
 * Report status
 */
export enum ReportStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  GENERATED = 'generated',
  FAILED = 'failed',
}

/**
 * Report category/name
 */
export enum ReportCategory {
  DAILY_SALES_OVERVIEW = 'daily_sales_overview',
  WEEKLY_REVENUE_SUMMARY = 'weekly_revenue_summary',
  MONTHLY_PRODUCT_PERFORMANCE = 'monthly_product_performance',
  YEARLY_FINANCIAL_REPORT = 'yearly_financial_report',
  PRODUCT_SALES = 'product_sales',
  SERVICE_BOOKINGS = 'service_bookings',
  CUSTOMER_ANALYTICS = 'customer_analytics',
  CUSTOM = 'custom',
}

/**
 * Report data structure
 */
export interface ReportData {
  // Sales metrics
  totalRevenue?: number;
  totalOrders?: number;
  totalBookings?: number;
  averageOrderValue?: number;
  averageBookingValue?: number;
  
  // Product metrics
  topProducts?: Array<{
    productId: string;
    productName: string;
    unitsSold: number;
    revenue: number;
  }>;
  
  // Service metrics
  topServices?: Array<{
    serviceId: string;
    serviceName: string;
    bookingsCount: number;
    revenue: number;
  }>;
  
  // Customer metrics
  newCustomers?: number;
  returningCustomers?: number;
  customerRetentionRate?: number;
  
  // Financial metrics
  totalIncome?: number;
  totalExpenses?: number;
  netProfit?: number;
  
  // Additional data
  [key: string]: unknown;
}

/**
 * Report document
 */
export interface Report extends BaseDocument {
  title: string; // e.g., "Daily Sales Overview", "Weekly Revenue Summary"
  category: ReportCategory;
  type: ReportType; // daily, weekly, monthly, yearly, custom
  status: ReportStatus;
  
  // Period
  period: {
    start: Date | string;
    end: Date | string;
  };
  
  // Generation info
  generatedAt: Date | string;
  generatedBy?: string; // Admin UID who generated it
  
  // Report data
  data: ReportData;
  
  // File/Export info
  fileUrl?: string; // URL to exported file (PDF, CSV, etc.)
  fileFormat?: 'pdf' | 'csv' | 'xlsx' | 'json';
  fileSize?: number; // in bytes
  
  // Metadata
  currency: string;
  notes?: string;
  errorMessage?: string; // If status is failed
  
  // Business reference (reports are business-specific)
  businessId?: string;
}

/**
 * Create report input
 */
export interface CreateReportInput {
  title: string;
  category: ReportCategory;
  type: ReportType;
  period: {
    start: Date | string;
    end: Date | string;
  };
  currency?: string;
  notes?: string;
}

