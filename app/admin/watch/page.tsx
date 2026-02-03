/**
 * Admin Watch page: displays a tutorial video from public/video folder
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui';
import { Play, Pause, Volume2, VolumeX, Maximize, ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/branding';

export default function AdminWatchPage() {
  const videos = [
    { id: 'admin-system-architecture', title: 'Understanding System Architecture & Scalability', file: '/video/admin-system-architecture.mp4', desc: 'Overview of architecture and scalability considerations.' },
    { id: 'admin-add-product', title: 'Adding Your First Product or Service', file: '/video/admin-add-product.mp4', desc: 'Step-by-step product/service creation.' },
    { id: 'admin-intro', title: 'Getting Started: Admin Dashboard Overview', file: '/video/admin-intro.mp4', desc: 'Quick tour of the admin dashboard.' },
    { id: 'admin-create-promotion', title: 'Creating and Managing Promotions', file: '/video/admin-create-promotion.mp4', desc: 'How to set up promotions and run tests.' },
    { id: 'admin-setup-payments', title: 'Configuring Payment Methods & Testing Transactions', file: '/video/admin-setup-payments.mp4', desc: 'Connect Paychangu and run test transactions.' },
    { id: 'admin-setup-delivery', title: 'Setting Up Delivery Providers & Fees', file: '/video/admin-setup-delivery.mp4', desc: 'Configure providers, regions and fees.' },
    { id: 'admin-manage-orders', title: 'Managing Orders, Bookings & Processing Refunds', file: '/video/admin-manage-orders.mp4', desc: 'Order lifecycle and refunds.' },
    { id: 'admin-featured-products', title: 'Featuring Products & Creating Banners', file: '/video/admin-featured-products.mp4', desc: 'Feature products and design banners.' },
    { id: 'admin-staff-permissions', title: 'Managing Staff Roles & Permissions', file: '/video/admin-staff-permissions.mp4', desc: 'Roles, permissions and audit logging.' },
    { id: 'admin-business-info', title: 'Understanding Business Information & Branding', file: '/video/admin-business-info.mp4', desc: 'Manage brand and business data.' },
    { id: 'admin-customers-analytics', title: 'Viewing Customer Data, Ledgers & Analytics Reports', file: '/video/admin-customers-analytics.mp4', desc: 'Reports and ledger insights.' },
    { id: 'admin-cost-control', title: 'Cost Control Settings & Performance Optimization', file: '/video/admin-cost-control.mp4', desc: 'Control costs and realtime listeners.' },
    { id: 'admin-policies', title: 'Managing Policies (Returns, Privacy, Terms)', file: '/video/admin-policies.mp4', desc: 'Create and manage policy pages.' },
    { id: 'reset-data', title: 'Resetting Business Data', file: '/video/reset-data.mp4', desc: 'How to reset business data safely.' },
  ];

  const [selected, setSelected] = useState(videos[0]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState('');
  const [openModal, setOpenModal] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => setDuration(video.duration);
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateDuration);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateDuration);
      video.removeEventListener('ended', handleEnded);
    };
  }, [selected]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch(() => setError('Failed to play video. Please check the file.'));
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const newTime = (parseFloat(e.target.value) / 100) * duration;
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="min-h-screen bg-background-secondary dark:bg-background-tertiary">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="bg-card rounded-lg p-4 sm:p-6 flex flex-col sm:flex-row items-center gap-4">
            <Link href="/admin" className="p-2 text-text-secondary hover:text-foreground transition-colors rounded-md hover:bg-accent/5">
              <ArrowLeft className="w-5 h-5" />
            </Link>

            <Logo href="/admin" size="md" className="shrink-0" />

            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-2xl md:text-3xl font-extrabold text-foreground leading-tight truncate">
                Understanding your e-commerce system
              </h1>
              <p className="text-sm text-text-secondary mt-1 truncate">
                Watch a quick tutorial to get started — tips, navigation and common tasks.
              </p>
            </div>

            <div className="hidden sm:flex items-center gap-3">
              <Link href="/admin/guide" className="text-sm text-foreground/80 hover:text-foreground transition-colors">
                View Guide
              </Link>
            </div>
          </div>
        </div>

        {/* Gallery */}
        <div className="mt-6 bg-card rounded-lg shadow-lg p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-foreground mb-3">Tutorial Videos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.map((v) => (
              <div key={v.id} className="bg-background rounded-md overflow-hidden shadow-sm">
                <div
                  className="relative bg-black aspect-video cursor-pointer"
                  onClick={() => { setSelected(v); setOpenModal(true); }}
                >
                  <video
                    className="w-full h-full object-cover"
                    src={v.file}
                    muted
                    playsInline
                    loop
                    onError={() => { /* ignore thumbnail load errors */ }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-white/80 rounded-full p-2 shadow-md">
                      <Play className="w-6 h-6 text-black" />
                    </div>
                  </div>
                </div>
                <div className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-medium text-foreground truncate">{v.title}</h3>
                      <p className="text-xs text-text-secondary mt-1 line-clamp-2">{v.desc}</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <Link href={`/admin/watch/${v.id}`} className="text-sm text-primary hover:underline">Open</Link>
                      <button
                        onClick={() => { setSelected(v); setOpenModal(true); }}
                        className="mt-2 text-xs text-foreground/80 hover:underline"
                      >
                        Play
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal large player */}
        {openModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
            <div className="w-full max-w-4xl bg-card rounded-lg overflow-hidden">
              <div className="relative bg-black aspect-video">
                <video
                  className="w-full h-full"
                  src={selected.file}
                  controls
                  autoPlay
                />
              </div>
              <div className="p-3 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">{selected.title}</h3>
                  <p className="text-xs text-text-secondary">{selected.desc}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setOpenModal(false)}>Close</Button>
                  <Link href={`/admin/watch/${selected.id}`}>
                    <Button size="sm">Open Page</Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 12px;
          height: 12px;
          background: white;
          border-radius: 50%;
          cursor: pointer;
        }
        .slider::-moz-range-thumb {
          width: 12px;
          height: 12px;
          background: white;
          border-radius: 50%;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
}
