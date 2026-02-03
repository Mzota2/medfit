'use client';

import React, { useState } from 'react';
import { Button, Input, Textarea, useToast } from '@/components/ui';
import { useBusinesses } from '@/hooks';
import { Loading } from '@/components/ui/Loading';
import { getUserFriendlyMessage } from '@/lib/utils/user-messages';
import { MapPin, Navigation } from 'lucide-react';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import ResponsiveMap from '@/components/maps/ResponsiveMap';
import { SITE_CONFIG } from '@/lib/config/siteConfig';

export default function ContactPageClient() {
  const toast = useToast();
  // Fetch business data
  const { data: businesses = [], isLoading: businessLoading } = useBusinesses({ limit: 1 });
  const business = businesses.length > 0 ? businesses[0] : null;
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [activeFaqIndex, setActiveFaqIndex] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send message');
      }

      setSubmitted(true);
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (error) {
      console.error('Error submitting contact form:', error);
      toast.showError(getUserFriendlyMessage(error, 'Failed to send message. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const faqs = [
    { question: 'How do i sign up ?', answer: 'You can sign up by clicking the "Sign Up" button in the header or visiting /signup page.' },
    { question: 'What payment methods are supported?', answer: 'We support Airtel Money, TNM Mpamba, and Credit/Debit Cards (Visa, Mastercard, Amex) via Paychangu.' },
    { question: 'Where can I find billing information?', answer: 'You can find billing information in your Account Settings page under the Billing Information section.' },
    { question: 'I need technical support, what should I do?', answer: `Please fill out the contact form below or email us at ${business?.contactInfo?.email} for technical support.` },
    { question: 'Can I customize my store\'s appearance?', answer: 'Store customization features are available in the admin dashboard for business owners.' },
  ];

  // Format business address
  const formatAddress = () => {
    if (!business?.address) return '';
    const addr = business.address;
    const parts: string[] = [];
    if (addr.areaOrVillage) parts.push(addr.areaOrVillage);
    if (addr.traditionalAuthority) parts.push(addr.traditionalAuthority);
    if (addr.nearestTownOrTradingCentre) parts.push(addr.nearestTownOrTradingCentre);
    if (addr.district) parts.push(addr.district);
    if (addr.region) parts.push(addr.region);
    if (addr.country) parts.push(addr.country);
    return parts.join(', ');
  };

  if (businessLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  const businessEmail = business?.contactInfo?.email || SITE_CONFIG.defaultContactEmail;
  const businessPhone = business?.contactInfo?.phone || SITE_CONFIG.defaultContactPhone;
  const businessAddress = formatAddress();
  const hasGoogleMap = business?.googleMap && business.googleMap.trim() !== '';
  const hasMapImage = business?.mapImage && business.mapImage.trim() !== '';
  const hasDirections = business?.address?.directions && business.address.directions.trim() !== '';

  return (
    <div className="min-h-screen bg-background-secondary py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-foreground mb-4">Contact Us</h1>
        <p className="text-text-secondary mb-8">
          Whether you have a question about our services, need technical assistance, or want to partner with us, our team is ready to help.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-card rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-foreground mb-2">Get in Touch</h2>
              <p className="text-sm text-text-secondary mb-6">
                We&apos;re here to help with any questions about Storefront Management.
              </p>

              {submitted ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-foreground mb-4">Thank you for contacting us! We&apos;ll get back to you soon.</p>
                  <Button onClick={() => setSubmitted(false)}>Send Another Message</Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    label="Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="James Smith"
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    placeholder="jamessmith@gmail.com"
                  />
                  <Input
                    label="Subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    required
                    placeholder="Inquiry about billing"
                  />
                  <Textarea
                    label="Message"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                    rows={6}
                  />
                  <Button type="submit" size="lg" isLoading={isSubmitting}>
                    Send Message
                  </Button>
                </form>
              )}
            </div>
          </div>

          {/* Contact Details & FAQ */}
          <div className="space-y-6">
            {/* Contact Details */}
            <div className="bg-card rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">Contact Details</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <a href={`mailto:${businessEmail}`} className="text-foreground hover:text-primary transition-colors">
                    {businessEmail}
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <a href={`tel:${businessPhone}`} className="text-foreground hover:text-primary transition-colors">
                    {businessPhone}
                  </a>
                </div>
                {businessAddress && (
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-primary mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-foreground">{businessAddress}</span>
                  </div>
                )}
              </div>
            </div>

            {/* FAQ */}
            <div className="bg-card rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">Frequently Asked Questions</h2>
              <div className="space-y-3">
                {faqs.map((faq, index) => (
                  <div 
                    key={index} 
                    className="border-b border-border last:border-b-0"
                  >
                    <div 
                      className="flex items-center justify-between py-3 cursor-pointer"
                      onClick={() => setActiveFaqIndex(activeFaqIndex === index ? null : index)}
                    >
                      <h3 className="font-medium text-foreground">{faq.question}</h3>
                      <svg
                        className={`w-5 h-5 text-foreground/70 transition-transform duration-200 ${
                          activeFaqIndex === index ? 'transform rotate-180' : ''
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                    {activeFaqIndex === index && (
                      <div className="pb-4 text-sm text-foreground/80">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Map Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-foreground mb-6">Our Location</h2>
          <div className="bg-card rounded-lg shadow-sm p-6">
            {hasGoogleMap ? (
              // Responsive map - fits width and scales height to the iframe's ratio
              <div className="w-full rounded-lg overflow-hidden border border-border">
                <ResponsiveMap html={business.googleMap || ''} />
              </div>
            ) : hasMapImage ? (
              // Display map image as alternative
              <div className="aspect-video rounded-lg overflow-hidden border border-border relative">
                <OptimizedImage
                  src={business.mapImage!}
                  alt="Business location map"
                  fill
                  context="banner"
                  aspectRatio="landscape"
                  className="object-cover"
                  sizes="100vw"
                />
              </div>
            ) : hasDirections ? (
              // Display address directions with proper styling
              <div className="bg-background-secondary rounded-lg p-6 border border-border">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 mt-1">
                    <MapPin className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground mb-3">How to Find Us</h3>
                    {businessAddress && (
                      <div className="mb-4">
                        <p className="text-sm font-medium text-text-secondary mb-1">Address:</p>
                        <p className="text-foreground">{businessAddress}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-text-secondary mb-2 flex items-center gap-2">
                        <Navigation className="w-4 h-4" />
                        Directions:
                      </p>
                      <div className="bg-card rounded-lg p-4 border border-border">
                        <p className="text-foreground whitespace-pre-line leading-relaxed">
                          {business.address.directions}
                        </p>
                      </div>
                    </div>
                    {business.address.coordinates && 
                     business.address.coordinates.latitude !== 0 && 
                     business.address.coordinates.longitude !== 0 && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <p className="text-sm text-text-secondary mb-2">Coordinates:</p>
                        <p className="text-foreground font-mono text-sm">
                          {business.address.coordinates.latitude}, {business.address.coordinates.longitude}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : businessAddress ? (
              // Fallback: Just show address if no map or directions
              <div className="bg-background-secondary rounded-lg p-6 border border-border">
                <div className="flex items-start gap-4">
                  <MapPin className="w-6 h-6 text-primary shrink-0 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Our Address</h3>
                    <p className="text-foreground">{businessAddress}</p>
                  </div>
                </div>
              </div>
            ) : (
              // No map data available
              <div className="aspect-video bg-background-secondary rounded-lg flex items-center justify-center border border-border">
                <div className="text-center">
                  <MapPin className="w-12 h-12 text-text-secondary mx-auto mb-3" />
                  <p className="text-text-secondary">Location information not available</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

