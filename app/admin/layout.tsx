/**
 * Admin layout wrapper
 * Note: Metadata cannot be exported from client components in Next.js App Router.
 * To prevent admin pages from being indexed, ensure robots.txt is configured
 * or add metadata to individual admin pages (they will inherit from parent layouts).
 */

'use client';

import { AdminGuard } from '@/components/admin/AdminGuard';

export default function AdminLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminGuard>
        {children}
    </AdminGuard>
  );
}

