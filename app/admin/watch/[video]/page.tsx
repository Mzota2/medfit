'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { ArrowLeft } from 'lucide-react';

const VIDEO_LIST = [
  { id: 'admin-system-architecture', title: 'Understanding System Architecture & Scalability', file: '/video/admin-system-architecture.mp4' },
  { id: 'admin-add-product', title: 'Adding Your First Product or Service', file: '/video/admin-add-product.mp4' },
  { id: 'admin-intro', title: 'Getting Started: Admin Dashboard Overview', file: '/video/admin-intro.mp4' },
  { id: 'admin-create-promotion', title: 'Creating and Managing Promotions', file: '/video/admin-create-promotion.mp4' },
  { id: 'admin-setup-payments', title: 'Configuring Payment Methods & Testing Transactions', file: '/video/admin-setup-payments.mp4' },
  { id: 'admin-setup-delivery', title: 'Setting Up Delivery Providers & Fees', file: '/video/admin-setup-delivery.mp4' },
  { id: 'admin-manage-orders', title: 'Managing Orders, Bookings & Processing Refunds', file: '/video/admin-manage-orders.mp4' },
  { id: 'admin-featured-products', title: 'Featuring Products & Creating Banners', file: '/video/admin-featured-products.mp4' },
  { id: 'admin-staff-permissions', title: 'Managing Staff Roles & Permissions', file: '/video/admin-staff-permissions.mp4' },
  { id: 'admin-business-info', title: 'Understanding Business Information & Branding', file: '/video/admin-business-info.mp4' },
  { id: 'admin-customers-analytics', title: 'Viewing Customer Data, Ledgers & Analytics Reports', file: '/video/admin-customers-analytics.mp4' },
  { id: 'admin-cost-control', title: 'Cost Control Settings & Performance Optimization', file: '/video/admin-cost-control.mp4' },
  { id: 'admin-policies', title: 'Managing Policies (Returns, Privacy, Terms)', file: '/video/admin-policies.mp4' },
  { id: 'reset-data', title: 'Resetting Business Data', file: '/video/reset-data.mp4' },
];

export default function AdminWatchVideoPage({ params }: { params: { video: string } }) {
  const { video } = params;
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = VIDEO_LIST.find((v) => v.id === video);

  if (!selected) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-xl bg-card rounded-lg p-6">
          <h2 className="text-lg font-semibold">Video not found</h2>
          <p className="text-sm text-text-secondary mt-2">The requested tutorial could not be found. Check the list on <Link href="/admin/watch" className="text-primary">Watch page</Link>.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-secondary p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/admin/watch" className="p-2 rounded-md hover:bg-accent/5 text-text-secondary"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="text-xl sm:text-2xl font-bold">{selected.title}</h1>
        </div>

        <div className="bg-card rounded-lg overflow-hidden">
          <div className="relative bg-black aspect-video">
            <video
                ref={videoRef}
                src={selected.file}
                className="w-full h-full"
                controls
                onError={() => setError('Failed to load video. Ensure the file exists under /public/video')}
              />
          </div>

          <div className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary">{selected.title}</p>
              {error && <p className="text-xs text-destructive mt-1">{error}</p>}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => router.push('/admin/watch')}>Back</Button>
              <Button size="sm" onClick={() => videoRef.current?.requestFullscreen()}>Fullscreen</Button>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-3">Other tutorials</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {VIDEO_LIST.map((v) => (
              <Link key={v.id} href={`/admin/watch/${v.id}`} className="bg-background rounded-md overflow-hidden p-2 text-sm hover:shadow">
                <div className="bg-black aspect-video mb-2">
                  <video className="w-full h-full object-cover" src={v.file} muted playsInline loop />
                </div>
                <div className="truncate">{v.title}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
