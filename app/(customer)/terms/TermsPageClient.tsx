'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { PolicyLinksSection } from '@/components/policies/PolicyLinksSection';
import { useActivePolicyByType } from '@/hooks';
import { PolicyType } from '@/types/policy';
import { getSettings } from '@/lib/settings';
import { formatDate } from '@/lib/utils/formatting';
import { Timestamp } from 'firebase/firestore';
import { SITE_CONFIG } from '@/lib/config/siteConfig';
import { sanitizeHtmlContent } from '@/lib/utils/sanitizeHtml';

export default function TermsPageClient() {
  const { currentBusiness } = useApp();
  const { data: policy } = useActivePolicyByType(PolicyType.TERMS, currentBusiness?.id);
  const [currency, setCurrency] = useState('MWK');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['acceptance', 'account', 'orders', 'pricing', 'delivery', 'cancellations', 'contact'])
  );

  // Load settings for currency
  React.useEffect(() => {
    getSettings()
      .then((settings) => {
        if (settings?.payment?.currency) {
          setCurrency(settings.payment.currency);
        }
      })
      .catch(() => {
        // Ignore errors
      });
  }, []);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const business = currentBusiness;
  const businessName = business?.name || SITE_CONFIG.defaultBusinessName;
  const businessEmail = business?.contactInfo?.email || SITE_CONFIG.defaultContactEmail || '';
  const businessPhone = business?.contactInfo?.phone || SITE_CONFIG.defaultContactPhone || '';
  

  const sections = [
    {
      id: 'acceptance',
      title: 'ACCEPTANCE OF TERMS',
      content: (
        <p className="text-foreground">
          By accessing or using services provided by <strong>{businessName}</strong>, you agree to these Terms & Conditions.
        </p>
      ),
    },
    {
      id: 'account',
      title: 'ACCOUNT RESPONSIBILITIES',
      content: (
        <ul className="list-disc list-inside space-y-2 text-foreground ml-4">
          <li>Maintaining account confidentiality</li>
          <li>Providing accurate information</li>
          <li>All activities under their account</li>
        </ul>
      ),
    },
    {
      id: 'orders',
      title: 'ORDER & BOOKINGS',
      content: (
        <div className="text-foreground space-y-2">
          <p>
            <strong>{businessName}</strong> reserves the right to:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Accept or reject orders</li>
            <li>Cancel bookings due to availability, pricing errors, or policy violation</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'pricing',
      title: 'PRICING & PAYMENTS',
      content: (
        <div className="text-foreground space-y-2">
          <p>Prices are displayed in <strong>{currency}</strong></p>
          <p>Payments are processed securely via <strong>Paychangu</strong></p>
        </div>
      ),
    },
    {
      id: 'delivery',
      title: 'DELIVERY & FULFILLMENT',
      content: (
        <p className="text-foreground">
          Delivery terms, fees, and timelines are defined by <strong>{businessName}</strong> and displayed at checkout.
        </p>
      ),
    },
    {
      id: 'cancellations',
      title: 'CANCELLATIONS',
      content: (
        <p className="text-foreground">
          Cancellation policies for products and services are defined in the Returns & Refund Policy
        </p>
      ),
    },
    {
      id: 'contact',
      title: 'CONTACT INFORMATION',
      content: (
        <div className="text-foreground space-y-2">
          <p><strong>Business Name:</strong> {businessName}</p>
          <p><strong>Email:</strong> {businessEmail}</p>
          <p><strong>Phone:</strong> {businessPhone}</p>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-background-secondary py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">TERMS & CONDITIONS</h1>
        <p className="text-sm text-text-secondary mb-8">
          Last Updated: {business?.updatedAt ? formatDate((business.updatedAt as Timestamp).toDate()) : 'N/A'}
        </p>

        <div className="bg-card rounded-lg shadow-sm divide-y divide-border">
          {sections.map((section) => (
            <div key={section.id} className="p-6">
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between text-left hover:bg-background-secondary rounded transition-colors"
              >
                <h2 className="text-lg font-semibold text-foreground">{section.title}</h2>
                <ChevronDown
                  className={`w-5 h-5 text-text-secondary transition-transform ${
                    expandedSections.has(section.id) ? 'transform rotate-180' : ''
                  }`}
                />
              </button>
              {expandedSections.has(section.id) && (
                <div className="mt-4 text-foreground">
                  {policy && section.id === 'terms' ? (
                    <div
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtmlContent(policy.content || '') }}
                    />
                  ) : (
                    <div className="prose prose-sm max-w-none">{section.content}</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Other Policies Section */}
        <PolicyLinksSection currentPath="/terms" />
      </div>
    </div>
  );
}

