'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Button, Badge, Input, Loading, useToast, ShareButton } from '@/components/ui';
import { Item, isService, ItemStatus } from '@/types';
import { getItemBySlug } from '@/lib/items';
import { getOptimizedImageUrl } from '@/lib/cloudinary/utils';
import { formatCurrency } from '@/lib/utils/formatting';
import { ReviewsSection } from '@/components/reviews';
import { useApp } from '@/contexts/AppContext';
import { useItemPromotion } from '@/hooks/useItemPromotion';
import { calculatePromotionPrice } from '@/lib/promotions/utils';
import { getEffectivePrice, getFinalPrice } from '@/lib/utils/pricing';
import { StoreTypeGuard } from '@/components/guards/StoreTypeGuard';
import { getUserFriendlyMessage, ERROR_MESSAGES } from '@/lib/utils/user-messages';

export default function ServiceDetailPageClient() {
  return (
    <StoreTypeGuard requireServices={true} redirectTo="/">
      <ServiceDetailPageContent />
    </StoreTypeGuard>
  );
}

function ServiceDetailPageContent() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const slug = params?.slug as string;
  const { currentBusiness } = useApp();

  const [service, setService] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [selectedPackage, setSelectedPackage] = useState('standard');
  const [attendees, setAttendees] = useState(1);
  const [isBooking, setIsBooking] = useState(false);

  useEffect(() => {
    if (slug) {
      loadService();
    }
  }, [slug]);

  const loadService = async () => {
    setLoading(true);
    try {
      const item = await getItemBySlug(slug);
      if (item && isService(item)) {
        setService(item);
      } else {
        console.error('Service not found or is not a service');
      }
    } catch (error) {
      console.error('Error loading service:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookNow = async () => {
    if (!service || !selectedDate || !selectedTimeSlot) {
      toast.showWarning('Please select a date and time slot');
      return;
    }

    setIsBooking(true);

    try {
      // Create booking
      if (!service.id) {
        toast.showError('Service ID is missing. Please refresh the page and try again.');
        return;
      }
      const bookingData = {
        serviceId: service.id,
        customerEmail: '', // Will be filled from auth or form
        customerName: '',
        timeSlot: {
          startTime: new Date(`${selectedDate}T${selectedTimeSlot}`),
          endTime: new Date(new Date(`${selectedDate}T${selectedTimeSlot}`).getTime() + (service.duration || 60) * 60000),
          duration: service.duration || 60,
        },
      };

      // Redirect to booking page
      router.push(`/services/${slug}/book?date=${selectedDate}&time=${selectedTimeSlot}&attendees=${attendees}`);
    } catch (error) {
      console.error('Error booking service:', error);
      toast.showError(getUserFriendlyMessage(error, ERROR_MESSAGES.GENERIC));
    } finally {
      setIsBooking(false);
    }
  };

  // Check if service is on promotion from promotions collection (must be before conditional returns)
  const { promotion, isOnPromotion, discountPercentage } = useItemPromotion(service);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Service Not Found</h1>
          <Link href="/services">
            <Button>Back to Services</Button>
          </Link>
        </div>
      </div>
    );
  }

  const mainImage = service.images[selectedImageIndex]?.url || '/placeholder-service.jpg';

  // Step 1: Calculate promotion price from base price (promotion applied first)
  const promotionPrice = promotion 
    ? calculatePromotionPrice(service.pricing.basePrice, promotion)
    : null;

  // Step 2: Get final price (promotion price + transaction fee if enabled)
  const finalPrice = getFinalPrice(
    service.pricing.basePrice,
    promotionPrice,
    service.pricing.includeTransactionFee,
    service.pricing.transactionFeeRate
  );

  // For display: use totalFee if set, otherwise final price
  const displayPrice = service.totalFee || finalPrice;

  // For comparison/strikethrough: show price before promotion (with transaction fee if enabled)
  const effectivePrice = getEffectivePrice(
    service.pricing.basePrice,
    service.pricing.includeTransactionFee,
    service.pricing.transactionFeeRate
  );

  // Check for totalFee discount (backward compatibility)
  const hasTotalFeeDiscount = service.totalFee && service.totalFee !== service.pricing.basePrice;
  
  // Show promotion if item is in promotions collection OR has totalFee discount
  const showPromotion = isOnPromotion || hasTotalFeeDiscount;
  const timeSlots = [
    '9:00 AM - 12:00 PM',
    '12:00 PM - 3:00 PM',
    '3:00 PM - 6:00 PM',
    '6:00 PM - 9:00 PM',
  ];

  return (
    <div className="min-h-screen bg-background-secondary py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        <nav className="mb-6 text-sm">
          <ol className="flex items-center gap-2 text-text-secondary">
            <li><Link href="/" className="hover:text-primary transition-colors">Home</Link></li>
            <li>/</li>
            <li><Link href="/services" className="hover:text-primary transition-colors">Services</Link></li>
            <li>/</li>
            <li className="text-foreground">{service.name}</li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
          {/* Image Gallery */}
          <div>
            <div className="relative aspect-square w-full bg-background-secondary rounded-lg overflow-hidden mb-4">
              <Image
                src={getOptimizedImageUrl(mainImage, { width: 800, height: 800, format: 'webp' })}
                alt={service.name}
                fill
                className="object-cover"
                priority
              />
            </div>
            
            {/* Thumbnail Gallery */}
            {service.images.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {service.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 ${
                      selectedImageIndex === index
                        ? 'border-primary'
                        : 'border-transparent hover:border-border'
                    }`}
                  >
                    <Image
                      src={getOptimizedImageUrl(image.url, { width: 150, height: 150, format: 'webp' })}
                      alt={`${service.name} - Image ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Service Info */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              {service.status === ItemStatus.ACTIVE && (
                <>
                  <Badge variant="success">Available</Badge>
                  <Badge variant="info">Eco-Friendly</Badge>
                </>
              )}
            </div>

            <div className="flex items-center justify-between gap-4 mb-4">
              <h1 className="text-3xl font-bold text-foreground">{service.name}</h1>
              <ShareButton
                url={typeof window !== 'undefined' ? window.location.href : ''}
                title={service.name}
                description={service.description}
                variant="outline"
                size="md"
                color='text-white'
              />
            </div>
            <div className="mb-6">
              <div className="flex items-baseline gap-4 flex-wrap">
                <span className="text-3xl font-bold text-primary">
                  {formatCurrency(displayPrice, service.pricing.currency)}
                </span>
                {(promotionPrice !== null || hasTotalFeeDiscount) && (
                  <span className="text-xl text-text-tertiary line-through">
                    {formatCurrency(effectivePrice, service.pricing.currency)}
                  </span>
                )}
                {showPromotion && discountPercentage > 0 && (
                  <Badge variant="danger">{discountPercentage}% Off</Badge>
                )}
                {showPromotion && discountPercentage === 0 && (
                  <Badge variant="danger">On Sale</Badge>
                )}
              </div>
              {service.bookingFee && service.bookingFee > 0 && (
                <div className="mt-2 text-sm text-text-secondary">
                  <span className="font-medium">Booking Fee:</span> {formatCurrency(service.bookingFee, service.pricing.currency)}
                  {service.allowPartialPayment && (
                    <span className="ml-1">(Pay now, rest later)</span>
                  )}
                </div>
              )}
              {service.bookingFee && service.bookingFee > 0 && service.allowPartialPayment && (
                <div className="mt-1 text-xs text-text-secondary">
                  You can pay the booking fee now ({formatCurrency(service.bookingFee, service.pricing.currency)}) and the remaining balance later
                </div>
              )}
            </div>

            {service.description && (
              <p className="text-foreground leading-relaxed mb-6">{service.description}</p>
            )}

            {/* What's Included */}
            {service.tags && service.tags.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-foreground mb-3">What&apos;s Included:</h3>
                <div className="grid grid-cols-2 gap-2">
                  {/* Tags as included items */}
                  {service.tags.map((tag, index) => (
                    <div key={`tag-${index}`} className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm text-foreground">{tag}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Booking Form */}
            <div className="bg-card rounded-lg shadow-sm p-6 space-y-4 mb-6">
              <h3 className="font-semibold text-foreground mb-4">Book This Service</h3>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Select Date</label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Select Time Slot</label>
                <select
                  value={selectedTimeSlot}
                  onChange={(e) => setSelectedTimeSlot(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                >
                  <option value="">Choose a time slot</option>
                  {timeSlots.map((slot) => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Service Package</label>
                <select
                  value={selectedPackage}
                  onChange={(e) => setSelectedPackage(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                >
                  <option value="standard">Standard Clean</option>
                  <option value="premium">Premium Clean</option>
                  <option value="deep">Deep Clean</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Number of Attendees</label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setAttendees(Math.max(1, attendees - 1))}
                    className="w-10 h-10 rounded-lg border border-border flex items-center justify-center hover:bg-background-secondary"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  </button>
                  <input
                    type="number"
                    value={attendees}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1;
                      if (val >= 1) setAttendees(val);
                    }}
                    min={1}
                    className="w-20 text-center px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                  />
                  <button
                    onClick={() => setAttendees(attendees + 1)}
                    className="w-10 h-10 rounded-lg border border-border flex items-center justify-center hover:bg-background-secondary"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              </div>

              <Button
                size="lg"
                className="w-full"
                onClick={handleBookNow}
                isLoading={isBooking}
                disabled={!selectedDate || !selectedTimeSlot}
              >
                Book Now
              </Button>
            </div>
          </div>
        </div>

        {/* Service Specifications */}
        {service.specifications && Object.keys(service.specifications).length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-foreground">Service Specifications</h2>
            <div className="bg-card rounded-lg shadow-sm p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(service.specifications).map(([key, value]) => (
                  <div key={key}>
                    <span className="font-medium text-foreground">{key}:</span>
                    <span className="ml-2 text-text-secondary">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Seller Information */}
        {/* <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-foreground">Seller Information</h2>
          <div className="bg-card rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-background-secondary rounded-full flex items-center justify-center">
                <span className="text-2xl">👤</span>
              </div>
              <div>
                <h3 className="font-semibold text-lg text-foreground">Service Provider</h3>
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="w-5 h-5 text-warning" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-sm text-text-secondary">4.9/5.0 Rating (1500+ reviews)</span>
                </div>
              </div>
            </div>
            <p className="text-foreground mb-4">
              Service provider description and information would go here.
            </p>
            <Button variant="outline">Contact Seller</Button>
          </div>
        </div> */}

        {/* Reviews Section */}
        {service && (
          <div className="mb-12">
            <ReviewsSection 
              itemId={service.id || ''} 
              businessId={currentBusiness?.id}
              reviewType="item"
              itemName={service.name}
            />
          </div>
        )}

        {/* Recommended Services */}
        <div>
          <h2 className="text-2xl font-bold mb-6 text-foreground">Recommended Services</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Recommended services would be loaded here */}
            <p className="text-text-muted">Recommended services will appear here</p>
          </div>
        </div>
      </div>
    </div>
  );
}

