'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { Policy, PolicyType } from '@/types/policy';
import { PolicyLinksSection } from '@/components/policies/PolicyLinksSection';
import { COLLECTIONS } from '@/types/collections';
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Loading } from '@/components/ui/Loading';
import { useBusinesses } from '@/hooks';
import { formatDate } from '@/lib/utils/formatting';
import { sanitizeHtmlContent } from '@/lib/utils/sanitizeHtml';
import { SITE_CONFIG } from '@/lib/config/siteConfig';

export default function PrivacyPageClient() {
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['introduction']));
  
  // Fetch business data
  const { data: businesses = [], isLoading: businessLoading } = useBusinesses({ limit: 1 });
  const business = businesses.length > 0 ? businesses[0] : null;

  useEffect(() => {
    loadPolicy();
  }, []);

  const loadPolicy = async () => {
    try {
      const policyQuery = query(
        collection(db, COLLECTIONS.POLICIES),
        where('type', '==', PolicyType.PRIVACY),
        where('isActive', '==', true),
        orderBy('version', 'desc'),
        limit(1)
      );
      const policySnap = await getDocs(policyQuery);
      
      if (!policySnap.empty) {
        setPolicy({ id: policySnap.docs[0].id, ...policySnap.docs[0].data() } as Policy);
      }
    } catch (error) {
      console.error('Error loading policy:', error);
    } finally {
      setLoading(false);
    }
  };

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

  if (loading || businessLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  const businessName = business?.name || SITE_CONFIG.defaultBusinessName;
  const contactEmail = business?.contactInfo?.email || SITE_CONFIG.defaultContactEmail;
  const contactPhone = business?.contactInfo?.phone || '';

  const sections = [
    { id: 'introduction', title: 'INTRODUCTION' },
    { id: 'information', title: 'INFORMATION WE COLLECT' },
    { id: 'usage', title: 'HOW WE USE YOUR INFORMATION' },
    { id: 'sharing', title: 'DATA SHARING' },
    { id: 'security', title: 'DATA SECURITY' },
    { id: 'retention', title: 'DATA RETENTION' },
    { id: 'rights', title: 'YOUR RIGHTS' },
  ];

  return (
    <div className="min-h-screen bg-background-secondary py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">PRIVACY POLICY</h1>
        <p className="text-sm text-text-secondary mb-8">
        Last Updated: {formatDate((business?.updatedAt as Timestamp)?.toDate() || new Date())}
        </p>
        <div className="bg-card rounded-lg shadow-sm divide-y divide-border">
          {sections.map((section) => (
            <div key={section.id} className="p-6">
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between text-left"
              >
                <h2 className="text-lg font-semibold text-foreground">{section.title}</h2>
                <ChevronDown
                  className={`w-5 h-5 text-text-secondary transition-transform ${
                    expandedSections.has(section.id) ? 'transform rotate-180' : ''
                  }`}
                />
              </button>
              {expandedSections.has(section.id) && (
                <div className="mt-4 text-foreground space-y-4">
                  {policy ? (
                    <div dangerouslySetInnerHTML={{ __html: sanitizeHtmlContent(policy.content || '') }} />
                  ) : (
                    <div className="prose prose-sm max-w-none">
                      {section.id === 'introduction' && (
                        <div>
                          <p className="mb-4">
                            Welcome to {businessName} (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;).
                          </p>
                          <p>
                            This Privacy Policy explains how we collect, use, store, and protect your personal information when you use our website, mobile applications, and services.
                          </p>
                        </div>
                      )}
                      {section.id === 'information' && (
                        <ul className="list-disc list-inside space-y-2 ml-4">
                          <li>Personal details (name, email address, phone number)</li>
                          <li>Account information</li>
                          <li>Order and booking history</li>
                          <li>Payment confirmation details (payments are processed securely by third-party providers)</li>
                          <li>Technical data (IP address, device type, browser)</li>
                        </ul>
                      )}
                      {section.id === 'usage' && (
                        <ul className="list-disc list-inside space-y-2 ml-4">
                          <li>Process orders and service bookings</li>
                          <li>Provide customer support</li>
                          <li>Improve our services</li>
                          <li>Comply with legal obligations</li>
                          <li>Send important service notifications</li>
                        </ul>
                      )}
                      {section.id === 'sharing' && (
                        <div>
                          <p className="mb-2">We may share data with:</p>
                          <ul className="list-disc list-inside space-y-2 ml-4">
                            <li><strong>Paychangu</strong> - Our payment processing provider, to securely process your payments</li>
                            <li>Delivery partners (if applicable) - To fulfill your orders</li>
                            <li>Legal or regulatory authorities where required by law</li>
                          </ul>
                        </div>
                      )}
                      {section.id === 'security' && (
                        <p>
                          {businessName} uses reasonable technical and organizational measures to protect customer data. However, no system is completely secure.
                        </p>
                      )}
                      {section.id === 'retention' && (
                        <p>
                          We retain personal data only for as long as necessary to fulfill service and legal requirements.
                        </p>
                      )}
                      {section.id === 'rights' && (
                        <div className="space-y-4">
                          <p>
                            You may request access, correction, or deletion of your personal data by contacting us at:
                          </p>
                          <div className="bg-background-secondary p-4 rounded-lg space-y-2">
                            <p><strong>Business Name:</strong> {businessName}</p>
                            <p><strong>Email:</strong> {contactEmail}</p>
                            {contactPhone && <p><strong>Phone:</strong> {contactPhone}</p>}
                            {business?.contactInfo?.website && (
                              <p><strong>Website:</strong> <a href={business.contactInfo.website} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">{business.contactInfo.website}</a></p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Other Policies Section */}
        <PolicyLinksSection currentPath="/privacy" />
      </div>
    </div>
  );
}

