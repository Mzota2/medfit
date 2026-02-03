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
import { useDeliveryProviders } from '@/hooks/useDeliveryProviders';
import type { OpeningHours } from '@/types/business';

import { formatDate } from '@/lib/utils/formatting';
import { sanitizeHtmlContent } from '@/lib/utils/sanitizeHtml';
import { SITE_CONFIG } from '@/lib/config/siteConfig';

export default function DeliveryPageClient() {
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']));
  
  // Fetch business data
  const { data: businesses = [], isLoading: businessLoading } = useBusinesses({ limit: 1 });
  const business = businesses.length > 0 ? businesses[0] : null;
  
  // Fetch delivery providers
  const { data: deliveryProviders = [], isLoading: providersLoading } = useDeliveryProviders({
    isActive: true,
  });

  useEffect(() => {
    loadPolicy();
  }, []);

  const loadPolicy = async () => {
    try {
      const policyQuery = query(
        collection(db, COLLECTIONS.POLICIES),
        where('type', '==', PolicyType.DELIVERY),
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

  // Helper function to format opening hours
  const formatOpeningHours = (openingHours?: OpeningHours): string => {
    if (!openingHours) return 'Not specified';
    
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const formattedDays: string[] = [];
    
    days.forEach((day) => {
      const dayKey = day.toLowerCase() as 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
      const dayHours = openingHours.days[dayKey];
      
      if (dayHours?.isOpen) {
        const openTime = dayHours.openTime || openingHours.defaultHours?.openTime || 'N/A';
        const closeTime = dayHours.closeTime || openingHours.defaultHours?.closeTime || 'N/A';
        formattedDays.push(`${day}: ${openTime} - ${closeTime}`);
      } else if (dayHours && !dayHours.isOpen) {
        formattedDays.push(`${day}: Closed`);
      } else if (openingHours.defaultHours) {
        formattedDays.push(`${day}: ${openingHours.defaultHours.openTime} - ${openingHours.defaultHours.closeTime}`);
      }
    });
    
    return formattedDays.length > 0 ? formattedDays.join(', ') : 'Not specified';
  };

  // Helper function to format business address
  const formatBusinessAddress = (): string => {
    if (!business?.address) return 'Not specified';
    
    const addr = business.address;
    const parts: string[] = [];
    
    if (addr.areaOrVillage) parts.push(addr.areaOrVillage);
    if (addr.traditionalAuthority) parts.push(addr.traditionalAuthority);
    if (addr.district) parts.push(addr.district);
    if (addr.nearestTownOrTradingCentre) parts.push(addr.nearestTownOrTradingCentre);
    if (addr.region) parts.push(addr.region);
    if (addr.country) parts.push(addr.country);
    
    return parts.join(', ');
  };

  if (loading || businessLoading || providersLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  const businessName = business?.name || SITE_CONFIG.defaultBusinessName;
  const contactEmail = business?.contactInfo?.email || SITE_CONFIG.defaultContactEmail || '';
  const contactPhone = business?.contactInfo?.phone || SITE_CONFIG.defaultContactPhone || '';
  const businessAddress = formatBusinessAddress();
  const openingHoursText = formatOpeningHours(business?.openingHours);

  const sections = [
    { id: 'overview', title: 'OVERVIEW' },
    { id: 'fulfillmentOptions', title: 'FULFILLMENT OPTIONS' },
    { id: 'deliveryMethods', title: 'DELIVERY METHODS' },
    { id: 'deliveryCharges', title: 'DELIVERY CHARGES' },
    { id: 'deliveryTimeframes', title: 'DELIVERY TIMEFRAMES' },
    { id: 'pickupInformation', title: 'PICKUP INFORMATION' },
    { id: 'tracking', title: 'ORDER TRACKING' },
    { id: 'contact', title: 'CONTACT INFORMATION' },
  ];

  return (
    <div className="min-h-screen bg-background-secondary py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">DELIVERY POLICY</h1>
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
                      {section.id === 'overview' && (
                        <p>
                          This Delivery Policy explains the fulfillment options, delivery methods, and associated charges for orders placed with {businessName}. Customers have the choice between direct pickup and various delivery services.
                        </p>
                      )}
                      {section.id === 'fulfillmentOptions' && (
                        <div>
                          <p className="mb-2">Customers can choose from the following fulfillment options:</p>
                          <ul className="list-disc list-inside space-y-2 ml-4">
                            <li><strong>Direct Pickup:</strong> Collect your order directly from our store location</li>
                            <li><strong>Delivery:</strong> Have your order delivered to your specified address using one of our delivery partners</li>
                          </ul>
                        </div>
                      )}
                      {section.id === 'deliveryMethods' && (
                        <div>
                          <p className="mb-2">We offer delivery through the following services:</p>
                          {deliveryProviders.length > 0 ? (
                            <ul className="list-disc list-inside space-y-2 ml-4">
                              {deliveryProviders.map((provider) => (
                                <li key={provider.id}>
                                  <strong>{provider.name}:</strong>{' '}
                                  {provider.description || 'Delivery service'}
                                  {provider.estimatedDays && (
                                    <span> - Estimated {provider.estimatedDays.min}-{provider.estimatedDays.max} days</span>
                                  )}
                                  {provider.trackingAvailable && (
                                    <span className="text-primary"> (Tracking available)</span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-text-secondary">No delivery providers are currently available. Please contact us for delivery options.</p>
                          )}
                          <p className="mt-4 text-sm text-text-secondary">
                            Available delivery methods may vary based on your delivery address and order value.
                          </p>
                        </div>
                      )}
                      {section.id === 'deliveryCharges' && (
                        <div>
                          <p className="mb-2">Delivery charges may apply depending on the selected delivery service:</p>
                          <ul className="list-disc list-inside space-y-2 ml-4">
                            <li>Delivery fees vary based on the delivery method selected</li>
                            <li>Free delivery may be available for orders above a certain threshold (if applicable)</li>
                          </ul>
                          <p className="mt-4 text-sm text-text-secondary">
                            Final delivery charges will be displayed during checkout before payment confirmation.
                          </p>
                        </div>
                      )}
                      {section.id === 'deliveryTimeframes' && (
                        <div>
                          <p className="mb-2">Estimated delivery timeframes:</p>
                          {deliveryProviders.length > 0 ? (
                            <ul className="list-disc list-inside space-y-2 ml-4">
                              {deliveryProviders.map((provider) => (
                                <li key={provider.id}>
                                  <strong>{provider.name}:</strong>{' '}
                                  {provider.estimatedDays
                                    ? `${provider.estimatedDays.min}-${provider.estimatedDays.max} business days`
                                    : 'Timeframes vary by location'
                                  }
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-text-secondary">Please contact us for delivery timeframes.</p>
                          )}
                          <p className="mt-4 text-sm text-text-secondary">
                            <strong>Note:</strong> Delivery timeframes are estimates and may vary due to factors such as location, weather conditions, and courier availability.
                          </p>
                        </div>
                      )}
                      {section.id === 'pickupInformation' && (
                        <div>
                          <p className="mb-2">For direct pickup orders:</p>
                          <ul className="list-disc list-inside space-y-2 ml-4">
                            <li><strong>Pickup location:</strong> {businessAddress}</li>
                            <li><strong>Pickup hours:</strong> {openingHoursText}</li>
                            <li>Please bring a valid ID and order confirmation when collecting your order</li>
                            <li>Orders will be held for pickup during business hours</li>
                          </ul>
                          <p className="mt-4">
                            No delivery charges apply for pickup orders.
                          </p>
                        </div>
                      )}
                      {section.id === 'tracking' && (
                        <div>
                          <p className="mb-2">Order tracking:</p>
                          <ul className="list-disc list-inside space-y-2 ml-4">
                            <li>Tracking information will be provided via email and SMS (if available) once your order is dispatched</li>
                            <li>Track your order status through your account profile when an order is selected</li>
                            <li>Delivery services provide their own tracking systems and reference numbers</li>
                            {deliveryProviders.some(p => p.trackingAvailable) && (
                              <li>Tracking is available for the following services: {deliveryProviders.filter(p => p.trackingAvailable).map(p => p.name).join(', ')}</li>
                            )}
                          </ul>
                        </div>
                      )}
                      {section.id === 'contact' && (
                        <div className="space-y-4">
                          <p>For delivery inquiries or issues, please contact us:</p>
                          <div className="bg-background-secondary p-4 rounded-lg space-y-2">
                            <p><strong>Business Name:</strong> {businessName}</p>
                            {contactEmail && <p><strong>Email:</strong> <a href={`mailto:${contactEmail}`} className="text-primary hover:underline">{contactEmail}</a></p>}
                            {contactPhone && <p><strong>Phone:</strong> <a href={`tel:${contactPhone}`} className="text-primary hover:underline">{contactPhone}</a></p>}
                            {business?.contactInfo?.website && (
                              <p><strong>Website:</strong> <a href={business.contactInfo.website} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">{business.contactInfo.website}</a></p>
                            )}
                            <p><strong>Pickup Address:</strong> {businessAddress}</p>
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
        <PolicyLinksSection currentPath="/delivery" />
      </div>
    </div>
  );
}

