'use client';

import React from 'react';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import Link from 'next/link';
import { Button, Loading } from '@/components/ui';
import { useTeam } from '@/hooks';
import { useApp } from '@/contexts/AppContext';
import { UserRole } from '@/types/user';
import { ReviewsSection } from '@/components/reviews';
import { SITE_CONFIG } from '@/lib/config/siteConfig';
export default function AboutPageClient() {
  const { currentBusiness } = useApp();
  const { data: teamMembers = [], isLoading: teamLoading } = useTeam({
    enabled: true,
    businessId: currentBusiness?.id,
  });

  const coreValues = [
    {
      icon: '💡',
      title: 'Innovation',
      description: 'Continuously pushing boundaries to develop groundbreaking solutions that redefine industry standards.',
    },
    {
      icon: '🛡️',
      title: 'Integrity',
      description: 'Operating with unwavering honesty, transparency, and ethical conduct in all our engagements.',
    },
    {
      icon: '⚙️',
      title: 'Excellence',
      description: 'Striving for the highest quality in products and services, always exceeding expectations.',
    },
    {
      icon: '✓',
      title: 'Customer Focus',
      description: 'Prioritizing client needs and success, building lasting partnerships through dedicated support.',
    },
  ];

  const businessInfo = [
    {
      icon: '📋',
      title: 'Terms & Conditions',
      description: 'Read our terms and conditions for using our platform.',
      link: '/terms',
      linkText: 'Read Terms →',
    },
    {
      icon: '📄',
      title: 'Privacy Policy',
      description: 'Understand how we diligently protect your personal data and privacy.',
      link: '/privacy',
      linkText: 'Read Policy →',
    },
    {
      icon: '🚚',
      title: 'Delivery Policy',
      description: 'Details on our service delivery processes, timelines, and commitments.',
      link: '/delivery',
      linkText: 'View Details →',
    },
    {
      icon: '💰',
      title: 'Refund Policy',
      description: 'Information regarding our refund process, eligibility, and terms.',
      link: '/returns',
      linkText: 'Review Policy →',
    },
  ];

  return (
    <div className="min-h-screen bg-background-secondary">
      {/* Hero Section */}
      <section className="bg-background py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Mobile: Image first, Desktop: Image second */}
            <div className="relative aspect-video bg-background-secondary rounded-lg overflow-hidden order-1 lg:order-2">
              <div className="absolute inset-0 flex items-center justify-center">
                <OptimizedImage
                  src={currentBusiness?.banner? currentBusiness?.banner : '/images/banner.jpg'}
                  alt="About eShopCure"
                  fill
                  context="banner"
                  aspectRatio="landscape"
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
            </div>
            
            {/* Mobile: Text second, Desktop: Text first */}
            <div className="order-2 lg:order-1">
              <h1 className="text-4xl font-bold text-foreground mb-4">
                About eShopCure
              </h1>
              <p className="text-lg text-foreground mb-8">
                {currentBusiness?.description || SITE_CONFIG.appDescription} 
              </p>
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-4">
                <Link href="/contact">
                  <Button size="lg" className="w-full sm:w-auto">Contact Us</Button>
                </Link>
                <Link href="/products">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    Explore Products →
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Values */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12 text-foreground">Our Mission & Core Values</h2>
          <div className="lg:hidden">
            {/* Mobile: Horizontal scroll */}
            <div className="flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory">
              {coreValues.map((value, index) => (
                <div key={index} className="flex-none w-80 bg-card rounded-lg shadow-sm p-6 text-center snap-start">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">{value.icon}</span>
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">{value.title}</h3>
                  <p className="text-text-secondary">{value.description}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="hidden lg:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Desktop: Normal grid */}
            {coreValues.map((value, index) => (
              <div key={index} className="bg-card rounded-lg shadow-sm p-6 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">{value.icon}</span>
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">{value.title}</h3>
                <p className="text-text-secondary">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Meet Our Dedicated Team</h2>
            <p className="text-lg text-text-secondary max-w-3xl mx-auto">
              Our diverse team of visionary leaders, skilled engineers, and passionate customer success professionals are the backbone of BizSolutions. United by a shared commitment to innovation and client satisfaction, we collaborate to bring you the best in business technology.
            </p>
          </div>
          {teamLoading ? (
            <div className="flex justify-center py-12">
              <Loading size="lg" />
            </div>
          ) : teamMembers.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {teamMembers.map((member) => {
                const normalizeName = (name: string) => {
                  return name
                    .toLowerCase()
                    .split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');
                };

                const firstName = member.firstName ? normalizeName(member.firstName) : '';
                const lastName = member.lastName ? normalizeName(member.lastName) : '';
                const displayName = 
                  (firstName && lastName ? `${firstName} ${lastName}` : 
                  firstName || lastName || 
                  (member.displayName ? normalizeName(member.displayName) : '') || 
                  (member.email?.split('@')[0] ? normalizeName(member.email.split('@')[0]) : '') || 
                  'Team Member');
                const imageUrl = member.image || member.photoURL;
                const position = member.position || (member.role === UserRole.ADMIN ? 'Administrator' : 'Staff Member');
                
                return (
                  <div key={member.id || member.uid} className="text-center">
                    <div className="relative aspect-square w-full bg-background-secondary rounded-lg overflow-hidden mb-4">
                      {imageUrl ? (
                        <OptimizedImage
                          src={imageUrl}
                          alt={displayName}
                          fill
                          className="object-cover"
                          context="detail"
                          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-4xl text-primary">
                              {(displayName[0] || 'U').toUpperCase()}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    <h3 className="font-semibold text-foreground">{displayName}</h3>
                    <p className="text-sm text-text-secondary">{position}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-text-secondary">Team information coming soon.</p>
            </div>
          )}
        </div>
      </section>

      {/* Business Reviews Section */}
      <section className="py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">What Our Customers Say</h2>
            <p className="text-lg text-text-secondary max-w-3xl mx-auto">
              Don&apos;t just take our word for it - see what our customers have to say about their experience with us.
            </p>
          </div>
          {currentBusiness?.id && (
            <ReviewsSection
              businessId={currentBusiness.id}
              reviewType="business"
              title="Customer Reviews"
            />
          )}
        </div>
      </section>

      {/* Business Information */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Essential Business Information</h2>
            <p className="text-lg text-text-secondary max-w-3xl mx-auto">
              Find comprehensive details about our operations, policies, and how to connect with us. Your trust and clarity are paramount to our partnership.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {businessInfo.map((info, index) => (
              <div key={index} className="bg-card rounded-lg shadow-sm p-6">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <span className="text-2xl">{info.icon}</span>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{info.title}</h3>
                <p className="text-sm text-text-secondary mb-4">{info.description}</p>
                <Link href={info.link} className="text-primary hover:text-primary-hover font-medium text-sm transition-colors">
                  {info.linkText}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

