'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Timestamp } from 'firebase/firestore';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Filter, X } from 'lucide-react';
import { ProductCard } from '@/components/products';
import { Button, Input, Badge } from '@/components/ui';
import { Loading } from '@/components/ui/Loading';
import { Item, ItemStatus, isProduct } from '@/types';
import { useCart } from '@/contexts/CartContext';
import { useApp } from '@/contexts/AppContext';
import { useProducts, usePromotions } from '@/hooks';
import { useCategories } from '@/hooks/useCategories';
import { StoreTypeGuard } from '@/components/guards/StoreTypeGuard';
import { PromotionStatus } from '@/types/promotion';
import { findItemPromotion } from '@/lib/promotions/cartUtils';

interface FilterState {
  category: string;
  condition: string[];
  priceMin: number;
  priceMax: number;
  availability: string[];
  onPromotion: boolean;
}

export default function ProductsPageClient() {
  return (
    <StoreTypeGuard requireProducts={true} redirectTo="/">
      <ProductsPageContent />
    </StoreTypeGuard>
  );
}

function ProductsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { addItem } = useCart();
  const { currentBusiness, filters: appFilters, updateProductFilters, resetProductFilters } = useApp();
  
  // State declarations
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [priceFilterEnabled, setPriceFilterEnabled] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Initialize filters from URL params or use AppContext filters (without priceRange initially)
  const [localFilters, setLocalFilters] = useState<FilterState>({
    category: 'all',
    condition: appFilters.products.condition || [],
    priceMin: appFilters.products.priceMin ?? 0,
    priceMax: appFilters.products.priceMax ?? 10000,
    availability: appFilters.products.availability || ['in_stock'],
    onPromotion: false,
  });

  // Fetch promotions for promotion filter
  const { data: promotions = [] } = usePromotions({
    businessId: currentBusiness?.id,
    status: PromotionStatus.ACTIVE,
    enabled: !!currentBusiness?.id,
  });
  
  // Use filters (local state takes precedence for this page)
  const filters = localFilters;

  // Fetch categories with React Query
  const {
    data: categories = [],
    isLoading: categoriesLoading,
  } = useCategories({
    type: 'product',
    businessId: currentBusiness?.id,
    enabled: !!currentBusiness?.id,
  });

  // Convert category name to ID for API filtering
  const categoryIdForApi = useMemo(() => {
    if (filters.category === 'all') return undefined;
    
    // Debug: Log what we're trying to match
    console.log('Looking for category:', filters.category);
    console.log('Available categories:', categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      normalizedName: cat.name.toLowerCase().replace(/\s+/g, '-')
    })));
    
    // Try multiple matching strategies
    const category = categories.find(cat => {
      const normalizedName = cat.name.toLowerCase().replace(/\s+/g, '-');
      const normalizedName2 = cat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      const filterName = filters.category.toLowerCase();
      
      console.log('Comparing:', {
        filterName,
        normalizedName,
        normalizedName2,
        match1: normalizedName === filterName,
        match2: normalizedName2 === filterName
      });
      
      return normalizedName === filterName || normalizedName2 === filterName;
    });
    
    console.log('Found category:', category);
    return category?.id;
  }, [filters.category, categories]);

  // Fetch products with React Query
  // Note: Don't filter by status initially - let client-side filtering handle it
  // This ensures we get all products, then filter by availability client-side
  // Using polling instead of real-time to save Firebase quota (poll every 10 minutes)
  const {
    data: products = [],
    isLoading: productsLoading,
    error: productsError,
  } = useProducts({
    businessId: currentBusiness?.id,
    // Don't filter by status here - fetch all and filter client-side
    status: undefined,
    categoryId: categoryIdForApi,
    enabled: !!currentBusiness?.id,
  });

  // Calculate price range only when price filter is enabled (saves computation)
  const priceRange = useMemo(() => {
    if (!priceFilterEnabled || products.length === 0) {
      return { min: 0, max: 10000 }; // Default fallback when filter is disabled
    }
    const prices = products.map(p => p.pricing?.basePrice || 0).filter(p => p > 0);
    if (prices.length === 0) {
      return { min: 0, max: 10000 }; // Default fallback
    }
    const min = Math.floor(Math.min(...prices));
    const max = Math.ceil(Math.max(...prices));
    // Add some padding to ensure we don't cut off items at the edges
    const padding = Math.max(1, Math.ceil((max - min) * 0.1)); // 10% padding
    return { 
      min: Math.max(0, min - padding), 
      max: max + padding 
    };
  }, [products, priceFilterEnabled]);

  // Note: Real-time updates removed to save Firebase quota
  // Using polling instead (refetchInterval in useProducts hook)

  // Get product categories (product + both types)
  const productCategories = useMemo(() => {
    const productCats = categories.filter(cat => cat.type === 'product');
    const bothCats = categories.filter(cat => cat.type === 'both');
    return [...productCats, ...bothCats];
  }, [categories]);

  // Add "All" option to categories
  const categoriesWithAll = useMemo(() => {
    return [
      { id: 'all', name: 'All Products', icon: '📦' },
      ...productCategories.map((cat) => ({
        id: cat.id!,
        name: cat.name,
        icon: cat.icon || '📦',
      })),
    ];
  }, [productCategories]);

  const conditions = [
    { id: 'new', label: 'New' },
    { id: 'used', label: 'Used' },
    { id: 'refurbished', label: 'Refurbished' },
  ];

  // Initialize price range when enabling price filter (handled in button click handler)
  // No useEffect needed - initialization happens on user interaction

  // Sync URL params with local filters
  useEffect(() => {
    const categoryFromUrl = searchParams.get('category');
    if (categoryFromUrl) {
      // Find the category by slug
      const category = categoriesWithAll.find(cat => 
        cat.id === categoryFromUrl || // Check by ID
        cat.name.toLowerCase().replace(/\s+/g, '-') === categoryFromUrl // Or by slug
      );
      
      if (category && category.id !== localFilters.category) {
        setLocalFilters(prev => ({
          ...prev,
          category: category.id
        }));
      }
    } else if (localFilters.category !== 'all') {
      setLocalFilters(prev => ({
        ...prev,
        category: 'all'
      }));
    }
  }, [searchParams, categoriesWithAll]);

  // Sync filters to AppContext after local state updates
  useEffect(() => {
    updateProductFilters({
      category: localFilters.category,
      priceMin: localFilters.priceMin,
      priceMax: localFilters.priceMax,
      availability: localFilters.availability,
      condition: localFilters.condition,
    });
  }, [localFilters, updateProductFilters]);

  // Filter and sort products client-side
  const filteredAndSortedProducts = useMemo(() => {
    let filtered = [...products];

    // Category filter (already handled by store, but double-check)
    if (filters.category !== 'all') {
      filtered = filtered.filter((p) => p.categoryIds?.includes(filters.category));
    }

    // Search filter
    if (searchQuery.trim()) {
      const queryLower = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(queryLower) ||
          p.description?.toLowerCase().includes(queryLower) ||
          p.tags?.some((tag) => tag.toLowerCase().includes(queryLower))
      );
    }

    // Price filter (only apply if enabled)
    if (priceFilterEnabled) {
      filtered = filtered.filter(
        (p) =>
          p.pricing.basePrice >= filters.priceMin &&
          p.pricing.basePrice <= filters.priceMax
      );
    }

    // Availability filter
    if (filters.availability.length > 0) {
      filtered = filtered.filter((p) => {
        const isInStock = p.status === ItemStatus.ACTIVE && 
          (p.inventory?.trackInventory === false || (p.inventory?.available ?? 0) > 0);
        const isOutOfStock = p.status === ItemStatus.OUT_OF_STOCK || 
          (p.inventory?.trackInventory === true && (p.inventory?.available ?? 0) <= 0);
        
        if (filters.availability.includes('in_stock') && filters.availability.includes('out_of_stock')) {
          return true;
        } else if (filters.availability.includes('in_stock')) {
          return isInStock;
        } else if (filters.availability.includes('out_of_stock')) {
          return isOutOfStock;
        }
        return true;
      });
    }

    // Promotion filter
    if (filters.onPromotion) {
      filtered = filtered.filter((p) => {
        const promotion = findItemPromotion(p, promotions);
        return !!promotion;
      });
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'price_low':
          return a.pricing.basePrice - b.pricing.basePrice;
        case 'price_high':
          return b.pricing.basePrice - a.pricing.basePrice;
        case 'newest':
        default:
          const aDate = a.createdAt instanceof Date 
            ? a.createdAt 
            : (a.createdAt instanceof Timestamp 
              ? a.createdAt.toDate() 
              : new Date(0));
          const bDate = b.createdAt instanceof Date 
            ? b.createdAt 
            : (b.createdAt instanceof Timestamp 
              ? b.createdAt.toDate() 
              : new Date(0));
          return bDate.getTime() - aDate.getTime();
      }
    });

    return sorted;
  }, [products, filters, searchQuery, sortBy, promotions, priceFilterEnabled]);

  const productsByCategory = useMemo(() => {
    const map: Record<string, Item[]> = {};

    productCategories.forEach((category) => {
      if (category.id) {
        map[category.id] = [];
      }
    });

    filteredAndSortedProducts.forEach((product) => {
      if (!product.categoryIds || product.categoryIds.length === 0) {
        return;
      }

      product.categoryIds.forEach((categoryId) => {
        if (map[categoryId]) {
          map[categoryId].push(product);
        }
      });
    });

    return map;
  }, [filteredAndSortedProducts, productCategories]);

  // Pagination
  const pageSize = 12;
  const totalProducts = filteredAndSortedProducts.length;
  const totalPages = Math.ceil(totalProducts / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedProducts = filteredAndSortedProducts.slice(startIndex, endIndex);

  const loading = productsLoading || categoriesLoading;

  const handleFilterChange = (key: keyof FilterState, value: FilterState[keyof FilterState]) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    setCurrentPage(1);

    // Update URL when category changes
    if (key === 'category') {
      const params = new URLSearchParams(searchParams.toString());
      const category = categoriesWithAll.find(cat => cat.id === value);
      
      if (value === 'all') {
        params.delete('category');
      } else if (category) {
        // Use the category name as a slug in the URL
        const slug = category.name.toLowerCase().replace(/\s+/g, '-');
        params.set('category', slug);
      } else {
        // Fallback to ID if category not found (shouldn't normally happen)
        params.set('category', value as string);
      }
      
      // Update URL without page reload
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.pushState({}, '', newUrl);
    }
  };

  const toggleCondition = (condition: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      condition: prev.condition.includes(condition)
        ? prev.condition.filter((c: string) => c !== condition)
        : [...prev.condition, condition],
    }));
    setCurrentPage(1);
  };

  const toggleAvailability = (availability: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      availability: prev.availability.includes(availability)
        ? prev.availability.filter((a: string) => a !== availability)
        : [...prev.availability, availability],
    }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    const defaultFilters = {
      category: 'all',
      condition: [],
      priceMin: 0,
      priceMax: 10000,
      availability: ['in_stock'],
      onPromotion: false,
    };
    setLocalFilters(defaultFilters);
    setPriceFilterEnabled(false);
    resetProductFilters();
    setSearchQuery('');
    setCurrentPage(1);
  };

  const handleAddToCart = (product: Item) => {
    // Only products can be added to cart
    if (isProduct(product)) {
      // Cast to any temporarily - CartContext should be updated to use Item type
      addItem(product as unknown as Parameters<typeof addItem>[0], 1);
    }
  };

  return (
    <div className="min-h-screen bg-background-secondary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumbs */}
        <nav className="mb-6 text-sm">
          <ol className="flex items-center gap-2 text-text-secondary">
            <li><Link href="/" className="hover:text-primary transition-colors">Home</Link></li>
            <li>/</li>
            <li><Link href="/products" className="hover:text-primary transition-colors">Products</Link></li>
            {filters.category !== 'all' && (
              <>
                <li>/</li>
                <li className="text-primary capitalize">
                  {categoriesWithAll.find(cat => cat.id === filters.category)?.name || filters.category}
                </li>
              </>
            )}
          </ol>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar - Desktop Only */}
          <aside className="hidden lg:block lg:col-span-1">
            <div className="bg-card rounded-lg shadow-sm p-6 sticky top-20">
              <h2 className="text-lg font-semibold mb-6 text-foreground">Filters</h2>

              {/* Categories */}
              <div className="mb-6">
                <h3 className="font-medium text-foreground mb-3">Categories</h3>
                {categoriesLoading ? (
                  <div className="flex justify-center py-4">
                    <Loading size="sm" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {categoriesWithAll.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => handleFilterChange('category', cat.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                          filters.category === cat.id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-background-secondary text-foreground hover:bg-background-tertiary'
                        }`}
                      >
                        <span>{cat.icon}</span>
                        <span>{cat.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Condition */}
              <div className="mb-6">
                <h3 className="font-medium text-foreground mb-3">Condition</h3>
                <div className="space-y-2">
                  {conditions.map((cond) => (
                    <label key={cond.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.condition.includes(cond.id)}
                        onChange={() => toggleCondition(cond.id)}
                        className="w-4 h-4 text-primary rounded focus:ring-primary"
                      />
                      <span className="text-sm text-foreground">{cond.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price Range - Only shown when enabled */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-foreground">Price</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setPriceFilterEnabled(!priceFilterEnabled);
                      if (!priceFilterEnabled) {
                        // When enabling, set to calculated range
                        setLocalFilters(prev => ({
                          ...prev,
                          priceMin: priceRange.min,
                          priceMax: priceRange.max,
                        }));
                      }
                    }}
                    className="text-sm text-primary hover:text-primary-hover transition-colors"
                  >
                    {priceFilterEnabled ? 'Hide' : 'Add Filter'}
                  </button>
                </div>
                {priceFilterEnabled && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={filters.priceMin}
                        onChange={(e) => handleFilterChange('priceMin', Number(e.target.value))}
                        className="w-full"
                        placeholder="0"
                      />
                      <span className="text-text-muted">-</span>
                      <Input
                        type="number"
                        value={filters.priceMax}
                        onChange={(e) => handleFilterChange('priceMax', Number(e.target.value))}
                        className="w-full"
                        placeholder="10000"
                      />
                    </div>
                    <p className="text-xs text-text-secondary">
                      Range: {priceRange.min.toLocaleString()} - {priceRange.max.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>

              {/* Availability */}
              <div className="mb-6">
                <h3 className="font-medium text-foreground mb-3">Availability</h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.availability.includes('in_stock')}
                      onChange={() => toggleAvailability('in_stock')}
                      className="w-4 h-4 text-primary rounded focus:ring-primary"
                    />
                    <span className="text-sm text-foreground">In Stock</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.availability.includes('out_of_stock')}
                      onChange={() => toggleAvailability('out_of_stock')}
                      className="w-4 h-4 text-primary rounded focus:ring-primary"
                    />
                    <span className="text-sm text-foreground">Out of Stock</span>
                  </label>
                </div>
              </div>

              {/* Promotion */}
              <div className="mb-6">
                <h3 className="font-medium text-foreground mb-3">Promotions</h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.onPromotion}
                      onChange={(e) => handleFilterChange('onPromotion', e.target.checked)}
                      className="w-4 h-4 text-primary rounded focus:ring-primary"
                    />
                    <span className="text-sm text-foreground">On Promotion</span>
                  </label>
                </div>
              </div>

              {/* Clear Filters */}
              <Button
                variant="outline"
                className="w-full"
                onClick={clearFilters}
              >
                Clear Filters
              </Button>
            </div>
          </aside>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Header */}
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">
                    {totalProducts > 0 ? `${totalProducts} Products Found` : 'Products'}
                  </h1>
                </div>
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  {/* Mobile Filter Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMobileFilters(true)}
                    className="lg:hidden flex items-center gap-2"
                  >
                    <Filter className="w-4 h-4" />
                    <span>Filters</span>
                  </Button>
                  <div className="flex items-center gap-2 sm:gap-4 flex-1 sm:flex-initial">
                    <label className="text-sm text-foreground hidden sm:inline">Sort by:</label>
                    <select
                      value={sortBy}
                      onChange={(e) => {
                        setSortBy(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground text-sm flex-1 sm:flex-initial"
                    >
                      <option value="newest">Newest</option>
                      <option value="price_low">Price: Low to High</option>
                      <option value="price_high">Price: High to Low</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Search */}
              <div className="mb-4">
                <Input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  icon={<Search className="w-5 h-5" />}
                />
              </div>

              {/* Active Filters */}
              {(filters.category !== 'all' || filters.condition.length > 0) && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {filters.category !== 'all' && (
                    <Badge variant="info" className="flex items-center gap-1">
                      Category: {categoriesWithAll.find((c) => c.id === filters.category)?.name}
                      <button
                        onClick={() => handleFilterChange('category', 'all')}
                        className="ml-1 hover:text-destructive transition-colors"
                      >
                        ×
                      </button>
                    </Badge>
                  )}
                  {filters.condition.map((cond) => (
                    <Badge key={cond} variant="info" className="flex items-center gap-1">
                      Category: {conditions.find((c) => c.id === cond)?.label}
                      <button
                        onClick={() => toggleCondition(cond)}
                        className="ml-1 hover:text-destructive transition-colors"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Products Grid */}
            {!currentBusiness?.id ? (
              <div className="flex justify-center items-center py-12">
                <Loading size="lg" />
              </div>
            ) : loading ? (
              <div className="flex justify-center items-center py-12">
                <Loading size="lg" />
              </div>
            ) : productsError ? (
              <div className="text-center py-12">
                <p className="text-text-secondary text-lg">Error loading products.</p>
                <p className="text-text-muted text-sm mt-2">{productsError.message}</p>
              </div>
            ) : filteredAndSortedProducts.length > 0 ? (
              filters.category === 'all' && productCategories.length > 0 ? (
                <div className="space-y-10">
                  {productCategories.map((category) => {
                    const categoryProducts = productsByCategory[category.id!] || [];
                    if (categoryProducts.length === 0) {
                      return null;
                    }
                    return (
                      <section key={category.id}>
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="text-xl font-semibold text-foreground">
                            {category.name}
                          </h2>
                        </div>
                        <div className="md:hidden -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
                          <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                            {categoryProducts.map((product) => (
                              <div key={product.id} className="shrink-0 w-[280px] snap-start">
                                <ProductCard
                                  product={product}
                                  onAddToCart={handleAddToCart}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                          {categoryProducts.map((product) => (
                            <ProductCard
                              key={product.id}
                              product={product}
                              onAddToCart={handleAddToCart}
                            />
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              ) : (
                <>
                  {/* Mobile: Horizontal Scroll, Desktop: Grid */}
                  <div className="md:hidden mb-6 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
                    <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                      {paginatedProducts.map((product) => (
                        <div key={product.id} className="shrink-0 w-[280px] snap-start">
                          <ProductCard
                            product={product}
                            onAddToCart={handleAddToCart}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Desktop: Grid Layout */}
                  <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {paginatedProducts.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onAddToCart={handleAddToCart}
                      />
                    ))}
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-text-secondary">
                      Showing {startIndex + 1}-{Math.min(endIndex, totalProducts)} of {totalProducts} products
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage >= totalPages}
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </>
              )
            ) : (
              <div className="text-center py-12">
                <p className="text-text-secondary text-lg">No products found.</p>
                <p className="text-text-muted text-sm mt-2">Try adjusting your filters or search query.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      {showMobileFilters && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-[200] lg:hidden"
            onClick={() => setShowMobileFilters(false)}
          />
          {/* Filter Drawer */}
          <div className="fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-card shadow-xl z-[201] lg:hidden transform transition-transform duration-300 ease-in-out overflow-y-auto">
            <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold text-foreground">Filters</h2>
              <button
                onClick={() => setShowMobileFilters(false)}
                className="p-2 text-foreground hover:text-primary transition-colors"
                aria-label="Close filters"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6">
              {/* Categories */}
              <div className="mb-6">
                <h3 className="font-medium text-foreground mb-3">Categories</h3>
                {categoriesLoading ? (
                  <div className="flex justify-center py-4">
                    <Loading size="sm" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {categoriesWithAll.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => handleFilterChange('category', cat.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                          filters.category === cat.id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-background-secondary text-foreground hover:bg-background-tertiary'
                        }`}
                      >
                        <span>{cat.icon}</span>
                        <span>{cat.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Condition */}
              <div className="mb-6">
                <h3 className="font-medium text-foreground mb-3">Condition</h3>
                <div className="space-y-2">
                  {conditions.map((cond) => (
                    <label key={cond.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.condition.includes(cond.id)}
                        onChange={() => toggleCondition(cond.id)}
                        className="w-4 h-4 text-primary rounded focus:ring-primary"
                      />
                      <span className="text-sm text-foreground">{cond.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-foreground">Price</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setPriceFilterEnabled(!priceFilterEnabled);
                      if (!priceFilterEnabled) {
                        setLocalFilters(prev => ({
                          ...prev,
                          priceMin: priceRange.min,
                          priceMax: priceRange.max,
                        }));
                      }
                    }}
                    className="text-sm text-primary hover:text-primary-hover transition-colors"
                  >
                    {priceFilterEnabled ? 'Hide' : 'Add Filter'}
                  </button>
                </div>
                {priceFilterEnabled && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={filters.priceMin}
                        onChange={(e) => handleFilterChange('priceMin', Number(e.target.value))}
                        className="w-full"
                        placeholder="0"
                      />
                      <span className="text-text-muted">-</span>
                      <Input
                        type="number"
                        value={filters.priceMax}
                        onChange={(e) => handleFilterChange('priceMax', Number(e.target.value))}
                        className="w-full"
                        placeholder="10000"
                      />
                    </div>
                    <p className="text-xs text-text-secondary">
                      Range: {priceRange.min.toLocaleString()} - {priceRange.max.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>

              {/* Availability */}
              <div className="mb-6">
                <h3 className="font-medium text-foreground mb-3">Availability</h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.availability.includes('in_stock')}
                      onChange={() => toggleAvailability('in_stock')}
                      className="w-4 h-4 text-primary rounded focus:ring-primary"
                    />
                    <span className="text-sm text-foreground">In Stock</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.availability.includes('out_of_stock')}
                      onChange={() => toggleAvailability('out_of_stock')}
                      className="w-4 h-4 text-primary rounded focus:ring-primary"
                    />
                    <span className="text-sm text-foreground">Out of Stock</span>
                  </label>
                </div>
              </div>

              {/* Promotion */}
              <div className="mb-6">
                <h3 className="font-medium text-foreground mb-3">Promotions</h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.onPromotion}
                      onChange={(e) => handleFilterChange('onPromotion', e.target.checked)}
                      className="w-4 h-4 text-primary rounded focus:ring-primary"
                    />
                    <span className="text-sm text-foreground">On Promotion</span>
                  </label>
                </div>
              </div>

              {/* Clear Filters */}
              <div className="flex flex-col gap-3 sticky bottom-0 bg-card pt-4 border-t border-border">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={clearFilters}
                >
                  Clear Filters
                </Button>
                <Button
                  className="w-full"
                  onClick={() => setShowMobileFilters(false)}
                >
                  Apply Filters
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

