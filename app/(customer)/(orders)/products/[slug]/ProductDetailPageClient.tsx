'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button, Badge, Loading, ShareButton, useToast } from '@/components/ui';
import { ProductImage } from '@/components/ui/OptimizedImage';
import { Item, isProduct, ItemVariant } from '@/types';
import { useCart } from '@/contexts/CartContext';
import { getItemBySlug } from '@/lib/items';
import { formatCurrency } from '@/lib/utils/formatting';
import { ReviewsSection } from '@/components/reviews';
import { useItemPromotion } from '@/hooks/useItemPromotion';
import { calculatePromotionPrice } from '@/lib/promotions/utils';
import { getEffectivePrice, getFinalPrice } from '@/lib/utils/pricing';
import { useApp } from '@/contexts/AppContext';
import { StoreTypeGuard } from '@/components/guards/StoreTypeGuard';
import { useActivePolicyByType } from '@/hooks/usePolicies';
import { PolicyType } from '@/types/policy';

export default function ProductDetailPageClient() {
  return (
    <StoreTypeGuard requireProducts={true} redirectTo="/">
      <ProductDetailPageContent />
    </StoreTypeGuard>
  );
}

function ProductDetailPageContent() {
  const params = useParams();
  const slug = params?.slug as string;
  const { addItem, items } = useCart();
  const { currentBusiness } = useApp();
  const toast = useToast();
  const [isAdded, setIsAdded] = useState(false);

  // Fetch policies
  const { data: deliveryPolicy } = useActivePolicyByType(
    PolicyType.DELIVERY,
    currentBusiness?.id,
    { enabled: !!currentBusiness?.id }
  );
  const { data: returnsPolicy } = useActivePolicyByType(
    PolicyType.RETURNS_REFUND,
    currentBusiness?.id,
    { enabled: !!currentBusiness?.id }
  );

  const [product, setProduct] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});

  useEffect(() => {
    if (slug) {
      loadProduct();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const loadProduct = async () => {
    setLoading(true);
    try {
      const item = await getItemBySlug(slug);
      if (item && isProduct(item)) {
        setProduct(item);
      } else {
        console.error('Product not found or is not a product');
      }
    } catch (error) {
      console.error('Error loading product:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVariantChange = (variantName: string, variantValue: string) => {
    setSelectedVariants((prev) => ({
      ...prev,
      [variantName]: variantValue,
    }));
  };

  // Check if product is already in cart
  const isInCart = product ? items.some(item => item.product.id === product.id) : false;

  const handleAddToCart = () => {
    if (product) {
      addItem(product, quantity, selectedVariants);
      setIsAdded(true);
      toast.showSuccess("Cart", `Successfully added ${product.name} to cart`);
      
      // Reset the added state after 2 seconds
      setTimeout(() => {
        setIsAdded(false);
      }, 2000);
    }
  };

  const incrementQuantity = () => {
    if (product && product.inventory && quantity < product.inventory.available) {
      setQuantity((prev) => prev + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity((prev) => prev - 1);
    }
  };

  // Check if product is on promotion from promotions collection (must be before conditional returns)
  const { promotion, isOnPromotion, discountPercentage } = useItemPromotion(product);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Product Not Found</h1>
          <Link href="/products">
            <Button>Back to Products</Button>
          </Link>
        </div>
      </div>
    );
  }

  const mainImage = product.images[selectedImageIndex]?.url || '/placeholder-product.jpg';

  // Step 1: Calculate promotion price from base price (promotion applied first)
  const promotionPrice = promotion 
    ? calculatePromotionPrice(product.pricing.basePrice, promotion)
    : null;

  // Step 2: Get final price (promotion price + transaction fee if enabled)
  const finalPrice = getFinalPrice(
    product.pricing.basePrice,
    promotionPrice,
    product.pricing.includeTransactionFee,
    product.pricing.transactionFeeRate
  );

  // For comparison/strikethrough: show price before promotion (with transaction fee if enabled)
  const effectivePrice = getEffectivePrice(
    product.pricing.basePrice,
    product.pricing.includeTransactionFee,
    product.pricing.transactionFeeRate
  );

  // Check for compareAtPrice discount (backward compatibility)
  const hasCompareAtPriceDiscount = product.pricing.compareAtPrice && product.pricing.compareAtPrice > product.pricing.basePrice;
  const compareAtPriceDiscount = hasCompareAtPriceDiscount
    ? Math.round(((product.pricing.compareAtPrice! - product.pricing.basePrice) / product.pricing.compareAtPrice!) * 100)
    : 0;

  // Use promotion discount percentage if available, otherwise use compareAtPrice discount
  const discount = discountPercentage > 0 ? discountPercentage : compareAtPriceDiscount;
  
  // Show promotion if item is in promotions collection OR has compareAtPrice discount
  const showPromotion = isOnPromotion || hasCompareAtPriceDiscount;

  return (
    <div className="min-h-screen bg-background-secondary py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        <nav className="mb-6 text-sm">
          <ol className="flex items-center gap-2 text-text-secondary">
            <li><Link href="/" className="hover:text-primary transition-colors">Home</Link></li>
            <li>/</li>
            <li><Link href="/products" className="hover:text-primary transition-colors">Products</Link></li>
            <li>/</li>
            <li className="text-foreground">{product.name}</li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
          {/* Image Gallery */}
          <div>
            <div className="relative aspect-square w-full bg-background-secondary rounded-lg overflow-hidden mb-4">
              <ProductImage
                src={mainImage}
                alt={product.name}
                fill
                context="detail"
                priority={true}
                className="object-cover"
              />
              {showPromotion && discount > 0 && (
                <div className="absolute top-4 right-4">
                  <Badge variant="danger">{discount}% OFF</Badge>
                </div>
              )}
              {showPromotion && discount === 0 && (
                <div className="absolute top-4 right-4">
                  <Badge variant="danger">On Sale</Badge>
                </div>
              )}
            </div>
            
            {/* Thumbnail Gallery */}
            {product.images.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 ${
                      selectedImageIndex === index
                        ? 'border-primary'
                        : 'border-transparent hover:border-border'
                    }`}
                  >
                    <ProductImage
                      src={image.url}
                      alt={`${product.name} - Image ${index + 1}`}
                      fill
                      context="card"
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              {product.status === 'active' && product.inventory && product.inventory.available > 0 && (
                <Badge variant="success">New Condition</Badge>
              )}
              {product.inventory && product.inventory.available > 0 ? (
                <Badge variant="success">In Stock ({product.inventory.available}+ available)</Badge>
              ) : (
                <Badge variant="danger">Out of Stock</Badge>
              )}
            </div>

            <div className="flex items-center justify-between gap-4 mb-4">
              <h1 className="text-3xl font-bold text-foreground">{product.name}</h1>
              <ShareButton
                url={typeof window !== 'undefined' ? window.location.href : ''}
                title={product.name}
                description={product.description}
                variant="outline"
                size="md"
                color='text-white'
              />
            </div>

            {/* Pricing */}
            <div className="mb-6">
              <div className="flex items-baseline gap-4 flex-wrap">
                <span className="text-3xl font-bold text-primary">
                  {formatCurrency(finalPrice, product.pricing.currency)}
                </span>
                {promotionPrice !== null && (
                  <span className="text-xl text-text-tertiary line-through">
                    {formatCurrency(effectivePrice, product.pricing.currency)}
                  </span>
                )}
                {promotionPrice === null && hasCompareAtPriceDiscount && product.pricing.compareAtPrice && (
                  <span className="text-xl text-text-tertiary line-through">
                    {formatCurrency(product.pricing.compareAtPrice, product.pricing.currency)}
                  </span>
                )}
                {showPromotion && discount > 0 && (
                  <Badge variant="danger">{discount}% Off</Badge>
                )}
                {showPromotion && discount === 0 && (
                  <Badge variant="danger">On Sale</Badge>
                )}
              </div>
            </div>

            {/* Description */}
            {product.description && (
              <div className="mb-6">
                <p className="text-foreground leading-relaxed">{product.description}</p>
              </div>
            )}

            {/* What's Included */}
            {product.tags && product.tags.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-foreground mb-3">What&apos;s Included:</h3>
                <div className="grid grid-cols-2 gap-2">
                  {product.tags.map((tag, index) => (
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

            {/* Variants */}
            {product.variants && product.variants.length > 0 && (
              <div className="mb-6 space-y-4">
                {Object.entries(
                  product.variants.reduce((acc, variant) => {
                    const variantType = variant.name.split(' ')[0]; // Assuming format like "Small Red" or "500ml"
                    if (!acc[variantType]) {
                      acc[variantType] = [];
                    }
                    acc[variantType].push(variant);
                    return acc;
                  }, {} as Record<string, ItemVariant[]>)
                ).map(([variantType, variants]) => (
                  <div key={variantType}>
                    <label className="block text-sm font-medium text-foreground mb-2 capitalize">
                      {variantType}
                    </label>
                    <div className="flex gap-2">
                      {variants.map((variant) => (
                        <button
                          key={variant.id}
                          onClick={() => handleVariantChange(variantType, variant.id)}
                          className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                            selectedVariants[variantType] === variant.id
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border hover:border-border-dark'
                          }`}
                        >
                          {variant.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quantity Selector */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-foreground mb-2">Quantity</label>
              <div className="flex items-center gap-4">
                <button
                  onClick={decrementQuantity}
                  disabled={quantity <= 1}
                  className="w-10 h-10 rounded-lg border border-border flex items-center justify-center hover:bg-background-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    if (product.inventory && val >= 1 && val <= product.inventory.available) {
                      setQuantity(val);
                    }
                  }}
                  min={1}
                  max={product.inventory?.available || 1}
                  className="w-20 text-center px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                />
                <button
                  onClick={incrementQuantity}
                  disabled={!product.inventory || quantity >= product.inventory.available}
                  className="w-10 h-10 rounded-lg border border-border flex items-center justify-center hover:bg-background-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Add to Cart Button */}
            <div className="mb-6">
              <Button
                size="lg"
                className="w-full"
                onClick={handleAddToCart}
                disabled={
                  product.status !== 'active' || 
                  !product.inventory || 
                  product.inventory.available === 0 ||
                  isInCart || 
                  isAdded
                }
                variant={isInCart || isAdded ? 'secondary' : 'outline'}
              >
                {!product.inventory || product.inventory.available === 0 
                  ? 'Out of Stock' 
                  : isAdded 
                    ? '✓ Added to Cart' 
                    : isInCart 
                      ? '✓ In Cart' 
                      : 'Add to Cart'}
              </Button>
            </div>

            {/* Delivery Info */}
            <div className="mb-6 p-4 bg-background-secondary rounded-lg">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm text-foreground">
                    <strong>Delivery:</strong>{' '}
                    {deliveryPolicy?.content ? (
                      <span>{deliveryPolicy.content.replace(/<[^>]*>/g, '').substring(0, 150).trim()}{deliveryPolicy.content.replace(/<[^>]*>/g, '').length > 150 ? '...' : ''}</span>
                    ) : (
                      <span>Delivery information available on our delivery policy page.</span>
                    )}
                  </p>
                </div>
                <Link href="/delivery" className="text-primary hover:underline text-sm whitespace-nowrap">
                  View Full Policy →
                </Link>
              </div>
            </div>

            {/* Return Policy */}
            <div className="p-4 bg-background-secondary rounded-lg">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm text-foreground">
                    <strong>Return Policy:</strong>{' '}
                    {currentBusiness?.returnDuration ? (
                      <span>
                        {currentBusiness.returnDuration}-day return policy.
                        {returnsPolicy?.content ? (
                          <span> {returnsPolicy.content.replace(/<[^>]*>/g, '').substring(0, 100).trim()}{returnsPolicy.content.replace(/<[^>]*>/g, '').length > 100 ? '...' : ''}</span>
                        ) : (
                          <span> See our returns policy for details.</span>
                        )}
                      </span>
                    ) : returnsPolicy?.content ? (
                      <span>{returnsPolicy.content.replace(/<[^>]*>/g, '').substring(0, 150).trim()}{returnsPolicy.content.replace(/<[^>]*>/g, '').length > 150 ? '...' : ''}</span>
                    ) : (
                      <span>Return information available on our returns policy page.</span>
                    )}
                  </p>
                </div>
                <Link href="/returns" className="text-primary hover:underline text-sm whitespace-nowrap">
                  View Full Policy →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Product Specifications */}
        {product && product.specifications && Object.keys(product.specifications).length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-foreground">Product Specifications</h2>
            <div className="bg-card rounded-lg shadow-sm p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(product.specifications).map(([key, value]) => (
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
                <span className="text-2xl">🏪</span>
              </div>
              <div>
                <h3 className="font-semibold text-lg text-foreground">Store Name</h3>
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="w-5 h-5 text-warning" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-sm text-text-secondary">4.8/5.0 Rating (1200+ sales)</span>
                </div>
              </div>
            </div>
            <p className="text-foreground">
              Store description and information would go here. This is a placeholder for seller details.
            </p>
            <Button variant="outline" className="mt-4">
              Contact Seller
            </Button>
          </div>
        </div> */}

        {/* Reviews Section */}
        {product && (
          <div className="mb-12">
            <ReviewsSection 
              itemId={product.id!} 
              businessId={currentBusiness?.id}
              reviewType="item"
              itemName={product.name}
            />
          </div>
        )}

        {/* Recommended Products */}
        <div>
          <h2 className="text-2xl font-bold mb-6 text-foreground">Recommended for You</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Recommended products would be loaded here */}
            <p className="text-text-muted">Recommended products will appear here</p>
          </div>
        </div>
      </div>
    </div>
  );
}

