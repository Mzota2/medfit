'use client';

import React from 'react';
import Link from 'next/link';

interface PolicyLink {
  icon: string;
  title: string;
  description: string;
  link: string;
  linkText: string;
}

interface PolicyLinksSectionProps {
  currentPath: string;
}

export function PolicyLinksSection({ currentPath }: PolicyLinksSectionProps) {
  const allPolicies: PolicyLink[] = [
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

  // Filter out the current policy
  const policiesToShow = allPolicies.filter((policy) => policy.link !== currentPath);

  return (
    <section className="mt-16 py-12 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">Related Policies</h2>
          <p className="text-lg text-text-secondary max-w-3xl mx-auto">
            Explore our other policies and important information.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {policiesToShow.map((info, index) => (
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
  );
}

