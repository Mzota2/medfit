/**
 * Reports CRUD operations
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/types/collections';
import { Report, ReportType, ReportStatus, ReportCategory, CreateReportInput } from '@/types/report';
import { NotFoundError, ValidationError } from '@/lib/utils/errors';

/**
 * Get report by ID
 */
export const getReportById = async (reportId: string): Promise<Report> => {
  const reportRef = doc(db, COLLECTIONS.REPORTS, reportId);
  const reportSnap = await getDoc(reportRef);

  if (!reportSnap.exists()) {
    throw new NotFoundError('Report');
  }

  return { id: reportSnap.id, ...reportSnap.data() } as Report;
};

/**
 * Get reports with filters
 */
export const getReports = async (options?: {
  type?: ReportType;
  category?: ReportCategory;
  status?: ReportStatus;
  businessId?: string;
  limit?: number;
  startDate?: Date;
  endDate?: Date;
}): Promise<Report[]> => {
  const reportsRef = collection(db, COLLECTIONS.REPORTS);
  let q = query(reportsRef);

  if (options?.type) {
    q = query(q, where('type', '==', options.type));
  }

  if (options?.category) {
    q = query(q, where('category', '==', options.category));
  }

  if (options?.status) {
    q = query(q, where('status', '==', options.status));
  }

  if (options?.businessId) {
    q = query(q, where('businessId', '==', options.businessId));
  }

  q = query(q, orderBy('generatedAt', 'desc'));

  if (options?.limit) {
    q = query(q, limit(options.limit));
  }

  const querySnapshot = await getDocs(q);
  let reports = querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Report[];

  // Filter by date range if provided
  if (options?.startDate || options?.endDate) {
    reports = reports.filter((report) => {
      const periodStart = report.period.start instanceof Date
        ? report.period.start
        : (report.period.start as { toDate?: () => Date })?.toDate?.() || new Date(String(report.period.start));
      const periodEnd = report.period.end instanceof Date
        ? report.period.end
        : (report.period.end as { toDate?: () => Date })?.toDate?.() || new Date(String(report.period.end));

      if (options?.startDate && periodEnd < options.startDate) return false;
      if (options?.endDate && periodStart > options.endDate) return false;
      return true;
    });
  }

  return reports;
};

/**
 * Create report
 * Note: This creates the report record. The actual report generation
 * should be done via API route or Cloud Function
 */
export const createReport = async (
  input: CreateReportInput,
  businessId?: string
): Promise<string> => {
  if (!input.title || !input.category || !input.type) {
    throw new ValidationError('Title, category, and type are required');
  }

  // Automatically get businessId if not provided
  let finalBusinessId = businessId;
  if (!finalBusinessId) {
    const { getBusinessId } = await import('@/lib/businesses/utils');
    finalBusinessId = await getBusinessId();
  }

  const reportData: Omit<Report, 'id'> = {
    title: input.title,
    category: input.category,
    type: input.type,
    status: ReportStatus.PENDING,
    period: {
      start: input.period.start,
      end: input.period.end,
    },
    generatedAt: serverTimestamp() as unknown as Date,
    data: {}, // Will be populated when report is generated
    currency: input.currency || 'MWK',
    notes: input.notes,
    businessId: finalBusinessId,
    createdAt: serverTimestamp() as unknown as Timestamp,
    updatedAt: serverTimestamp() as unknown as Timestamp,
  };

  const reportRef = await addDoc(collection(db, COLLECTIONS.REPORTS), reportData);
  return reportRef.id;
};

/**
 * Update report (e.g., when generation completes)
 */
export const updateReport = async (
  reportId: string,
  updates: Partial<Report>
): Promise<void> => {
  const reportRef = doc(db, COLLECTIONS.REPORTS, reportId);
  const reportSnap = await getDoc(reportRef);

  if (!reportSnap.exists()) {
    throw new NotFoundError('Report');
  }

  await updateDoc(reportRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Mark report as generated
 */
export const markReportAsGenerated = async (
  reportId: string,
  data: Report['data'],
  fileUrl?: string,
  fileFormat?: Report['fileFormat'],
  fileSize?: number
): Promise<void> => {
  await updateReport(reportId, {
    status: ReportStatus.GENERATED,
    data,
    fileUrl,
    fileFormat,
    fileSize,
    generatedAt: new Date(),
  });
};

/**
 * Mark report as failed
 */
export const markReportAsFailed = async (reportId: string, errorMessage: string): Promise<void> => {
  await updateReport(reportId, {
    status: ReportStatus.FAILED,
    errorMessage,
  });
};

