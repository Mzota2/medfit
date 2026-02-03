'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, AlertCircle } from 'lucide-react';
import { Policy, PolicyType } from '@/types/policy';
import { COLLECTIONS } from '@/types/collections';
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Loading } from '@/components/ui/Loading';
import { useBusinesses, useProducts } from '@/hooks';
import { ItemStatus, isProduct } from '@/types/item';
import { sanitizeHtmlContent } from '@/lib/utils/sanitizeHtml';
import { formatCurrency, formatDate } from '@/lib/utils/formatting';
import Link from 'next/link';
import { SITE_CONFIG } from '@/lib/config/siteConfig';

export default function RefundPageClient() {
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['introduction']));
  
  // Fetch business data
  const { data: businesses = [], isLoading: businessLoading } = useBusinesses({ limit: 1 });
  const business = businesses.length > 0 ? businesses[0] : null;
  
  // Fetch all active products to filter returnable ones
  const { data: allProducts = [], isLoading: productsLoading } = useProducts({
    status: ItemStatus.ACTIVE,
  });

  // Filter returnable and non-returnable products
  const returnableProducts = useMemo(() => {
    return allProducts.filter((item) => isProduct(item) && item.isReturnable !== false);
  }, [allProducts]);

  const nonReturnableProducts = useMemo(() => {
    return allProducts.filter((item) => isProduct(item) && item.isReturnable === false);
  }, [allProducts]);

  useEffect(() => {
    loadPolicy();
  }, []);

  const loadPolicy = async () => {
    try {
      const policyQuery = query(
        collection(db, COLLECTIONS.POLICIES),
        where('type', '==', PolicyType.RETURNS_REFUND),
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

  if (loading || businessLoading || productsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  const businessName = business?.name || SITE_CONFIG.defaultBusinessName;
  const contactEmail = business?.contactInfo?.email || SITE_CONFIG.defaultContactEmail;
  const contactPhone = business?.contactInfo?.phone || SITE_CONFIG.defaultContactPhone || '';
  const returnDuration = business?.returnDuration || 7;
  const refundDuration = business?.refundDuration || 3;
  const cancellationTime = business?.cancellationTime || 24;
  const returnShippingPayer = business?.returnShippingPayer || 'customer';

  const sections = [
    { id: 'introduction', title: 'INTRODUCTION' },
    { id: 'returnPolicy', title: 'RETURN POLICY' },
    { id: 'refundPolicy', title: 'REFUND POLICY' },
    { id: 'cancellationPolicy', title: 'CANCELLATION POLICY' },
    { id: 'returnableProducts', title: 'RETURNABLE PRODUCTS' },
    { id: 'nonReturnableProducts', title: 'NON-RETURNABLE PRODUCTS' },
    { id: 'returnShipping', title: 'RETURN SHIPPING' },
    { id: 'contact', title: 'CONTACT INFORMATION' },
  ];

  return (
    <div className="min-h-screen bg-background-secondary py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">REFUND & RETURN POLICY</h1>
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
                            Welcome to {businessName}. This Refund & Return Policy explains our policies regarding returns, refunds, and cancellations.
                          </p>
                          <p>
                            We want you to be completely satisfied with your purchase. Please read this policy carefully to understand your rights and our procedures.
                          </p>
                        </div>
                      )}
                      
                      {section.id === 'returnPolicy' && (
                        <div className="space-y-4">
                          <p>
                            You have <strong>{returnDuration} days</strong> from the date of purchase to return eligible items for a refund or exchange.
                          </p>
                          <p>To be eligible for a return, the item must:</p>
                          <ul className="list-disc list-inside space-y-2 ml-4">
                            <li>Be in its original condition (unused, unworn, unwashed, and with all tags attached)</li>
                            <li>Be in the original packaging</li>
                            <li>Include proof of purchase (order confirmation or receipt)</li>
                            <li>Be a returnable product (see Returnable Products section below)</li>
                          </ul>
                          <p className="mt-4">
                            To initiate a return, please contact us using the contact information provided at the bottom of this policy.
                          </p>
                        </div>
                      )}
                      
                      {section.id === 'refundPolicy' && (
                        <div className="space-y-4">
                          <p>
                            Once we receive and inspect your returned item, we will process your refund within <strong>{refundDuration} business days</strong>.
                          </p>
                          <p>Refunds will be issued to the original payment method used for the purchase.</p>
                          <p>Please note:</p>
                          <ul className="list-disc list-inside space-y-2 ml-4">
                            <li>Refunds may take 5-10 business days to appear in your account, depending on your bank or payment provider</li>
                            <li>Shipping costs are non-refundable unless the item was defective or incorrect</li>
                            <li>Any discounts or promotions applied to the original purchase will be reflected in the refund amount</li>
                          </ul>
                        </div>
                      )}
                      
                      {section.id === 'cancellationPolicy' && (
                        <div className="space-y-4">
                          <p>
                            For service bookings, you may cancel your booking up to <strong>{cancellationTime} hours</strong> before the scheduled service time to receive a full refund.
                          </p>
                          <p>Cancellation policies:</p>
                          <ul className="list-disc list-inside space-y-2 ml-4">
                            <li>Cancellations made more than {cancellationTime} hours in advance: Full refund</li>
                            <li>Cancellations made less than {cancellationTime} hours in advance: No refund (unless under exceptional circumstances)</li>
                            <li>No-show appointments: No refund</li>
                          </ul>
                          <p className="mt-4">
                            To cancel a booking, please contact us using the contact information provided below or through your account profile when the booking is selected.
                          </p>
                        </div>
                      )}
                      
                      {section.id === 'returnableProducts' && (
                        <div className="space-y-4">
                          <p>The following products are eligible for return:</p>
                          {returnableProducts.length > 0 ? (
                            <div className="bg-background-secondary rounded-lg p-4">
                              <ul className="space-y-2">
                                {returnableProducts.slice(0, 20).map((product) => (
                                  <li key={product.id} className="flex items-center justify-between">
                                    <Link 
                                      href={`/products/${product.slug}`}
                                      className="text-primary hover:underline flex-1"
                                    >
                                      {product.name}
                                    </Link>
                                    {product.pricing && (
                                      <span className="text-text-secondary ml-4">
                                        {formatCurrency(product.pricing.basePrice, product.pricing.currency)}
                                      </span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                              {returnableProducts.length > 20 && (
                                <p className="text-sm text-text-secondary mt-4">
                                  And {returnableProducts.length - 20} more returnable products...
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-text-secondary">No returnable products are currently listed.</p>
                          )}
                          <p className="text-sm text-text-secondary">
                            All returnable products are subject to our standard return conditions (see Return Policy section above).
                          </p>
                        </div>
                      )}
                      
                      {section.id === 'nonReturnableProducts' && (
                        <div className="space-y-4">
                          <div className="bg-warning/20 border border-warning/50 rounded-lg p-4 flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                            <div>
                              <p className="font-semibold text-foreground mb-2">
                                Important: Non-Returnable Items
                              </p>
                              <p className="text-sm">
                                The following products cannot be returned due to their nature. Please review carefully before purchase.
                              </p>
                            </div>
                          </div>
                          
                          {nonReturnableProducts.length > 0 ? (
                            <div className="bg-background-secondary rounded-lg p-4">
                              <ul className="space-y-2">
                                {nonReturnableProducts.map((product) => (
                                  <li key={product.id} className="flex items-center justify-between">
                                    <Link 
                                      href={`/products/${product.slug}`}
                                      className="text-foreground hover:text-primary flex-1"
                                    >
                                      {product.name}
                                    </Link>
                                    {product.pricing && (
                                      <span className="text-text-secondary ml-4">
                                        {formatCurrency(product.pricing.basePrice, product.pricing.currency)}
                                      </span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : (
                            <p className="text-text-secondary">No non-returnable products are currently listed.</p>
                          )}
                        </div>
                      )}
                      
                      {section.id === 'returnShipping' && (
                        <div className="space-y-4">
                          <p>
                            <strong>Who Pays for Return Shipping:</strong>
                          </p>
                          {returnShippingPayer === 'customer' ? (
                            <div>
                              <p>The customer is responsible for return shipping costs unless the item was defective or incorrect.</p>
                              <p className="mt-2">If you received a defective or incorrect item, we will cover the return shipping costs. Please contact us before returning the item.</p>
                            </div>
                          ) : (
                            <div>
                              <p>We cover all return shipping costs. Please contact us to arrange a return, and we will provide a prepaid return shipping label.</p>
                            </div>
                          )}
                          <p className="mt-4 text-sm text-text-secondary">
                            Return shipping costs will be deducted from your refund if you are responsible for them. For prepaid returns, the refund will be issued for the full purchase amount.
                          </p>
                        </div>
                      )}
                      
                      {section.id === 'contact' && (
                        <div className="space-y-4">
                          <p>
                            For return, refund, or cancellation requests, please contact us at:
                          </p>
                          <div className="bg-background-secondary p-4 rounded-lg space-y-2">
                            <p><strong>Business Name:</strong> {businessName}</p>
                            {contactEmail && (
                              <p><strong>Email:</strong> <a href={`mailto:${contactEmail}`} className="text-primary hover:underline">{contactEmail}</a></p>
                            )}
                            {contactPhone && (
                              <p><strong>Phone:</strong> <a href={`tel:${contactPhone}`} className="text-primary hover:underline">{contactPhone}</a></p>
                            )}
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
      </div>
    </div>
  );
}

