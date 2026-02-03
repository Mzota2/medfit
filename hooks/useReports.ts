/**
 * React Query hooks for Reports
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getReports, getReportById, createReport, updateReport } from '@/lib/reports';
import { Report, ReportType, ReportStatus, ReportCategory } from '@/types/report';

/**
 * Query key factory for reports
 */
export const reportKeys = {
  all: ['reports'] as const,
  lists: () => [...reportKeys.all, 'list'] as const,
  list: (filters: {
    type?: ReportType;
    category?: ReportCategory;
    status?: ReportStatus;
    businessId?: string;
  }) => [...reportKeys.lists(), filters] as const,
  details: () => [...reportKeys.all, 'detail'] as const,
  detail: (id: string) => [...reportKeys.details(), id] as const,
};

/**
 * Fetch reports with filters
 */
export const useReports = (options?: {
  type?: ReportType;
  category?: ReportCategory;
  status?: ReportStatus;
  businessId?: string;
  limit?: number;
  startDate?: Date;
  endDate?: Date;
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: reportKeys.list({
      type: options?.type,
      category: options?.category,
      status: options?.status,
      businessId: options?.businessId,
    }),
    queryFn: async () => {
      return await getReports({
        type: options?.type,
        category: options?.category,
        status: options?.status,
        businessId: options?.businessId,
        limit: options?.limit,
        startDate: options?.startDate,
        endDate: options?.endDate,
      });
    },
    enabled: options?.enabled !== false,
  });
};

/**
 * Fetch single report by ID
 */
export const useReport = (reportId: string | undefined, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: reportKeys.detail(reportId || ''),
    queryFn: async () => {
      if (!reportId) throw new Error('Report ID is required');
      return await getReportById(reportId);
    },
    enabled: options?.enabled !== false && !!reportId,
  });
};

/**
 * Create report mutation
 */
export const useCreateReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reportData,
      businessId,
    }: {
      reportData: Parameters<typeof createReport>[0];
      businessId?: string;
    }) => {
      return await createReport(reportData, businessId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportKeys.lists() });
    },
  });
};

/**
 * Update report mutation
 */
export const useUpdateReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reportId, updates }: { reportId: string; updates: Partial<Report> }) => {
      await updateReport(reportId, updates);
      return { reportId, updates };
    },
    onSuccess: ({ reportId }) => {
      queryClient.invalidateQueries({ queryKey: reportKeys.lists() });
      queryClient.invalidateQueries({ queryKey: reportKeys.detail(reportId) });
    },
  });
};

