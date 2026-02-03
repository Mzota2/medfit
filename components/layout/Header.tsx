/**
 * Main header component with navigation, search, cart, and user menu
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, ShoppingCart, Mail, Phone, MapPin, ChevronDown, X, UserIcon, SettingsIcon, Bell, Menu } from 'lucide-react';
import { LogOutIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Logo } from '@/components/branding/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/user';
import { LayoutDashboard } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { signOut } from '@/lib/auth';
import { LogoImage } from '@/components/ui/OptimizedImage';
import { useApp } from '@/contexts/AppContext';
import { Address } from '@/types/common';
import { OpeningHours, DayOfWeek } from '@/types/business';
import { Clock } from 'lucide-react';
import { useNotificationsByUserId, useNotificationsByEmail } from '@/hooks/useNotifications';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { useStoreType } from '@/hooks/useStoreType';
import { usePromotions } from '@/hooks/usePromotions';
import { PromotionStatus } from '@/types/promotion';
import { findItemPromotion, getItemEffectivePrice } from '@/lib/promotions/cartUtils';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

// Safe hooks that return defaults if context is not available
const useAuthSafe = () => {
  try {
    return useAuth();
  } catch {
    return { user: null, userRole: null, logout: async () => {} };
  }
};

const useCartSafe = () => {
  try {
    return useCart();
  } catch {
    return { itemCount: 0, totalAmount: 0, items: [] };
  }
};

export const Header: React.FC = () => {
  const pathname = usePathname();
  const { user, userRole, logout } = useAuthSafe();
  const { itemCount, items } = useCartSafe();
  const { currentBusiness, fetchCurrentBusiness, businessLoading } = useApp();
  
  // Fetch active promotions for calculating cart total with discounts
  const { data: promotions = [] } = usePromotions({
    status: PromotionStatus.ACTIVE,
  });
  
  // Calculate total with promotion prices
  const totalAmount = useMemo(() => {
    if (!items || items.length === 0) return 0;
    return items.reduce((sum, item) => {
      const promotion = findItemPromotion(item.product, promotions);
      const effectivePrice = getItemEffectivePrice(item.product, promotion);
      return sum + effectivePrice * item.quantity;
    }, 0);
  }, [items, promotions]);
  const { hasProducts, hasServices } = useStoreType();
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showContactDetails, setShowContactDetails] = useState(false);
  const [showOpeningHours, setShowOpeningHours] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  // Fetch unread notification count
  const { data: notificationsByUserId } = useNotificationsByUserId(
    user?.uid,
    { unreadOnly: true, limit: 100, enabled: !!user?.uid }
  );
  
  const { data: notificationsByEmail } = useNotificationsByEmail(
    user?.email || undefined,
    { limit: 100, enabled: !user?.uid && !!user?.email }
  );
  
  // Real-time updates for notifications (critical data - user needs immediate updates)
  useRealtimeNotifications({
    userId: user?.uid,
    email: user?.email || undefined,
    unreadOnly: true,
    enabled: !!user,
  });
  
  const unreadNotifications = user?.uid 
    ? (notificationsByUserId || []).filter(n => !n.readAt)
    : (notificationsByEmail || []).filter(n => !n.readAt);
  
  const unreadCount = unreadNotifications.length;
  
  // Fetch business data on mount
  useEffect(() => {
    if (!currentBusiness && !businessLoading) {
      fetchCurrentBusiness();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Build navigation based on store type
  const navigation = [
    { name: 'Home', href: '/' },
    ...(hasProducts ? [{ name: 'Products', href: '/products' }] : []),
    ...(hasServices ? [{ name: 'Services', href: '/services' }] : []),
    { name: 'About Us', href: '/about' },
    { name: 'Contact', href: '/contact' },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Redirect to products if products available, otherwise services
      if (hasProducts) {
      window.location.href = `/products?search=${encodeURIComponent(searchQuery)}`;
      } else if (hasServices) {
        window.location.href = `/services?search=${encodeURIComponent(searchQuery)}`;
      }
    }
  };

  // Format address for display
  const formatAddress = (businessAddress?: Address) => {
    if (!businessAddress) return '';
    const parts = [
      businessAddress.areaOrVillage,
      businessAddress.nearestTownOrTradingCentre? 'Near ' + businessAddress.nearestTownOrTradingCentre : '',
      businessAddress.district,
      businessAddress.region,
      businessAddress.country,
    ].filter(Boolean);
    return parts.join(', ');
  };

  // Get contact info with fallbacks
  const email = currentBusiness?.contactInfo?.email || 'info@techcure.tech';
  const phone = currentBusiness?.contactInfo?.phone || '+265 981 819 389';
  const businessAddress = currentBusiness?.address 
    ? formatAddress(currentBusiness.address) 
    : 'P.O Box, 573, Blantyre, Malawi';

  // Format opening hours for display
  const formatOpeningHours = (openingHours?: OpeningHours): string => {
    if (!openingHours) return 'Mon - Sun: 7:00 AM - 6:00 PM';
    
    const defaultOpen = openingHours.defaultHours?.openTime || '07:00';
    const defaultClose = openingHours.defaultHours?.closeTime || '18:00';
    
    // Format time from 24-hour to 12-hour format
    const formatTime = (time: string): string => {
      if (!time) return '';
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    };

    // Check if all days have same hours (use default)
    const allDaysSame = !openingHours.days || Object.keys(openingHours.days).length === 0;
    
    if (allDaysSame) {
      return `Mon - Sun: ${formatTime(defaultOpen)} - ${formatTime(defaultClose)}`;
    }

    // Group days with same hours
    const dayGroups: { hours: string; days: string[] }[] = [];
    const daysOrder: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayLabels: Record<DayOfWeek, string> = {
      monday: 'Mon',
      tuesday: 'Tue',
      wednesday: 'Wed',
      thursday: 'Thu',
      friday: 'Fri',
      saturday: 'Sat',
      sunday: 'Sun',
    };

    daysOrder.forEach((day) => {
      const dayHours = openingHours.days?.[day];
      const isOpen = dayHours?.isOpen ?? true;
      
      if (!isOpen) {
        // Find or create closed group
        let group = dayGroups.find(g => g.hours === 'Closed');
        if (!group) {
          group = { hours: 'Closed', days: [] };
          dayGroups.push(group);
        }
        group.days.push(dayLabels[day]);
      } else {
        const openTime = dayHours?.openTime || defaultOpen;
        const closeTime = dayHours?.closeTime || defaultClose;
        const hoursStr = `${formatTime(openTime)} - ${formatTime(closeTime)}${dayHours?.isHalfDay ? ' (Half Day)' : ''}`;
        
        let group = dayGroups.find(g => g.hours === hoursStr);
        if (!group) {
          group = { hours: hoursStr, days: [] };
          dayGroups.push(group);
        }
        group.days.push(dayLabels[day]);
      }
    });

    // Format groups
    return dayGroups.map(group => {
      if (group.days.length === 1) {
        return `${group.days[0]}: ${group.hours}`;
      } else if (group.days.length === 2) {
        return `${group.days[0]} & ${group.days[1]}: ${group.hours}`;
      } else {
        return `${group.days[0]} - ${group.days[group.days.length - 1]}: ${group.hours}`;
      }
    }).join(' | ');
  };

  const openingHoursDisplay = formatOpeningHours(currentBusiness?.openingHours);

  return (
    <>
      {/* Top Bar */}
      <div className="bg-background-secondary border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Opening Hours - Top Center - Responsive */}
          <div className="flex items-center justify-center py-1.5 sm:py-2 border-b border-border/50">
            {/* Desktop: Full text display */}
            <div className="hidden lg:flex items-center gap-2 text-text-secondary">
              <Clock className="w-4 h-4 shrink-0" />
              <span className="text-sm font-medium">{openingHoursDisplay}</span>
            </div>
            
            {/* Tablet: Truncated with tooltip */}
            <div className="hidden md:flex lg:hidden items-center gap-2 text-text-secondary">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span className="text-xs font-medium truncate max-w-[400px]" title={openingHoursDisplay}>
                {openingHoursDisplay}
              </span>
            </div>
            
          </div>
         
          <div className="flex items-center justify-between py-2 text-sm">
            {/* Contact Details - Responsive Design */}
            <div className="flex items-center gap-2 sm:gap-4 text-text-secondary flex-1 min-w-0">
              {/* Desktop: Show all details */}
              <div className="hidden lg:flex items-center gap-4">
                <a 
                  href={`mailto:${email}`} 
                  className="hover:text-primary transition-colors flex items-center gap-1.5 whitespace-nowrap"
                  title={email}
                >
                  <Mail className="w-4 h-4" />
                  <span className="truncate max-w-[200px]">{email}</span>
                </a>
                <a 
                  href={`tel:${phone?.replace(/\s/g, '')}`} 
                  className="hover:text-primary transition-colors flex items-center gap-1.5 whitespace-nowrap"
                  title={phone || ''}
                >
                  <Phone className="w-4 h-4" />
                  <span>{phone || ''}</span>
                </a>
                <div className="flex items-center gap-1.5 text-text-muted" title={businessAddress}>
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span className="truncate max-w-[320px]">{businessAddress}</span>
                </div>
              </div>

              {/* Tablet: Show email and phone, address in dropdown */}
              <div className="hidden md:flex lg:hidden items-center gap-3 z-101">
                <a 
                  href={`mailto:${email}`} 
                  className="hover:text-primary transition-colors flex items-center gap-1.5"
                  title={email}
                >
                  <Mail className="w-4 h-4" />
                  <span className="truncate max-w-[150px]">{email}</span>
                </a>
                <a 
                  href={`tel:${phone?.replace(/\s/g, '')}`} 
                  className="hover:text-primary transition-colors flex items-center gap-1.5"
                  title={phone || ''}
                >
                  <Phone className="w-4 h-4" />
                  <span className="truncate">{phone || ''}</span>
                </a>
                <div className="relative">
                  <button
                    onClick={() => setShowContactDetails(!showContactDetails)}
                    className="flex items-center gap-1.5 text-text-muted hover:text-primary transition-colors"
                    title="View address"
                  >
                    <MapPin className="w-4 h-4" />
                    <span className="truncate max-w-[120px]">Address</span>
                    <ChevronDown className={`w-3 h-3 transition-transform ${showContactDetails ? 'rotate-180' : ''}`} />
                  </button>
                  {showContactDetails && (
                    <div className="absolute left-0 top-full mt-1 bg-card rounded-lg shadow-lg p-3 z-50 border border-border min-w-[200px]">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-foreground">{businessAddress}</p>
                        <button
                          onClick={() => setShowContactDetails(false)}
                          className="text-text-muted hover:text-foreground transition-colors shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Mobile: Compact button that opens modal/dropdown */}
              <div className="flex md:hidden items-center gap-2">
                <a 
                  href={`mailto:${email}`} 
                  className="hover:text-primary transition-colors p-1.5"
                  title={email}
                >
                  <Mail className="w-4 h-4" />
                </a>
                <a 
                  href={`tel:${phone?.replace(/\s/g, '')}`} 
                  className="hover:text-primary transition-colors p-1.5"
                  title={phone || ''}
                >
                  <Phone className="w-4 h-4" />
                </a>
                <div className="relative">
                  <button
                    onClick={() => setShowContactDetails(!showContactDetails)}
                    className="hover:text-primary transition-colors p-1.5"
                    title="Contact details"
                  >
                    <MapPin className="w-4 h-4" />
                  </button>
                  {showContactDetails && (
                    <>
                      {/* Backdrop */}
                      <div 
                        className="fixed inset-0 z-101 bg-black/20"
                        onClick={() => setShowContactDetails(false)}
                      />
                      {/* Dropdown */}
                      <div className="absolute left-0 top-full mt-1 bg-card rounded-lg shadow-xl p-4 z-101 border border-border min-w-[280px] max-w-[90vw]">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <h3 className="text-sm font-semibold text-foreground">Contact Information</h3>
                          <button
                            onClick={() => setShowContactDetails(false)}
                            className="text-text-muted hover:text-foreground transition-colors shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="space-y-3">
                          <a 
                            href={`mailto:${email}`} 
                            className="flex items-start gap-2 text-sm text-text-secondary hover:text-primary transition-colors"
                          >
                            <Mail className="w-4 h-4 mt-0.5 shrink-0" />
                            <span className="break-all">{email}</span>
                          </a>
                          <a 
                            href={`tel:${phone?.replace(/\s/g, '')}`} 
                            className="flex items-start gap-2 text-sm text-text-secondary hover:text-primary transition-colors"
                          >
                            <Phone className="w-4 h-4 mt-0.5 shrink-0" />
                            <span>{phone || '' }</span>
                          </a>
                          <div className="flex items-start gap-2 text-sm text-text-muted">
                            <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                            <span className="wrap-break-word">{businessAddress}</span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Mobile Opening Hours: Icon button with dropdown */}
              <div className="flex md:hidden items-center relative">
                <button
                  onClick={() => setShowOpeningHours(!showOpeningHours)}
                  className="flex items-center gap-1.5 text-text-secondary hover:text-primary transition-colors px-2 py-1"
                  title="Opening hours"
                >
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-xs font-medium">Opening Hours</span>
                </button>
                {showOpeningHours && (
                  <>
                    {/* Backdrop */}
                    <div 
                      className="fixed inset-0 z-101 bg-black/20"
                      onClick={() => setShowOpeningHours(false)}
                    />
                    {/* Dropdown */}
                    <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 bg-card rounded-lg shadow-xl p-4 z-101 border border-border min-w-[280px] max-w-[90vw]">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <h3 className="text-sm font-semibold text-foreground">Opening Hours</h3>
                        <button
                          onClick={() => setShowOpeningHours(false)}
                          className="text-text-muted hover:text-foreground transition-colors shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-start gap-2 text-sm text-text-secondary">
                        <Clock className="w-4 h-4 mt-0.5 shrink-0" />
                        <span className="wrap-break-word">{openingHoursDisplay}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
             

            {/* Techcure Branding */}
            <div className="text-text-muted shrink-0 ml-2">
              <a 
                href="https://techcure.tech" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="hover:text-primary transition-colors flex items-center gap-2"
                title="Powered by Techcure"
              >
                <span className="hidden sm:inline">Powered by Techcure</span>
                <LogoImage src="/techcure.png" alt="Techcure" width={32} height={32} className='rounded-full shrink-0'/>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="bg-background shadow-sm sticky top-0 z-sticky z-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Logo size="md" href="/" />

            {/* Navigation - Desktop */}
            <nav className="hidden md:flex items-center gap-6">
              {navigation.map((item) => {
                const isActive = pathname === item.href || 
                  (item.href !== '/' && pathname?.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`text-sm font-medium transition-colors ${
                      isActive
                        ? 'text-primary'
                        : 'text-foreground hover:text-primary'
                    }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* Search, Cart, User, Mobile Menu Button */}
            <div className="flex items-center gap-4">
              {/* Search */}
              <form onSubmit={handleSearch} className="hidden lg:block">
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Search for products, categories,"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-64 pr-10"
                    icon={<Search className="w-5 h-5" />}
                  />
                </div>
              </form>

              

              {/* Notifications */}
              {user && (
                <Link href="/notifications" className="relative flex items-center text-foreground hover:text-primary transition-colors" title="Notifications">
                  <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 bg-primary text-primary-foreground text-[10px] sm:text-xs font-bold rounded-full min-w-[18px] sm:min-w-[20px] h-[18px] sm:h-5 flex items-center justify-center px-1 sm:px-1.5">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>
              )}

              {/* Cart */}
              <Link href="/cart" className="relative flex items-center gap-2 text-foreground hover:text-primary transition-colors">
                <ShoppingCart className="w-6 h-6" />
                {itemCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
                <span className="hidden sm:inline text-sm font-medium">
                  {totalAmount > 0 ? `MWK${totalAmount.toFixed(2)}` : 'MWK0.00'}
                </span>
              </Link>
              {/* Theme Toggle */}
              <div className="flex items-center">
                <ThemeToggle />
              </div>
              {/* User Menu - Hidden on very small screens */}
              {user ? (
                <div className="relative hidden sm:block">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
                  >
                    <div className="w-8 h-8 bg-background-secondary rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-foreground">
                        {user.email?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                  </button>
                  
                  {showUserMenu && (
                    <div className="absolute order-1 right-0 mt-2 w-48 bg-card rounded-lg shadow-lg py-1 z-dropdown border border-border">
                      {/* Admin Dashboard Link - Only show for admin/staff */}
                      {(userRole === UserRole.ADMIN || userRole === UserRole.STAFF) && (
                        <Link
                          href="/admin"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-background-secondary transition-colors"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <LayoutDashboard className="w-4 h-4" />
                          <span>Admin Dashboard</span>
                        </Link>
                      )}
                      <Link
                        href="/profile"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-background-secondary transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <UserIcon className="w-4 h-4" />
                        <span>Profile</span>
                      </Link>
                      <Link
                        href="/settings"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-background-secondary transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <SettingsIcon className="w-4 h-4" />
                        <span>Settings</span>
                      </Link>
                      <button
                        onClick={async () => {
                          try {
                            // Sign out from Firebase
                            await signOut();
                            
                            // Call context logout for state cleanup (includes React Query cache clearing)
                            await logout();
                            
                            // Redirect to home page
                            window.location.href = '/';
                          } catch (error) {
                            console.error('Error signing out:', error);
                            // Even if there's an error, try to redirect
                            window.location.href = '/';
                          }
                          setShowUserMenu(false);
                        }}
                        className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-foreground hover:bg-background-secondary transition-colors"
                      >
                        <LogOutIcon className="w-4 h-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link href="/login" className="hidden sm:block">
                  <Button variant="outline" size="sm">
                    Sign In
                  </Button>
                </Link>
              )}

              {/* Mobile Menu Button - Rightmost */}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="md:hidden p-2 text-foreground hover:text-primary transition-colors"
                aria-label="Toggle menu"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {showMobileMenu && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-[200] md:hidden"
            onClick={() => setShowMobileMenu(false)}
          />
          {/* Mobile Menu Sidebar */}
          <div className="fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-card shadow-xl z-[201] md:hidden transform transition-transform duration-300 ease-in-out">
            <div className="flex flex-col h-full">
              {/* Mobile Menu Header - Fixed */}
              <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
                <Logo size="md" href="/" />
                <button
                  onClick={() => setShowMobileMenu(false)}
                  className="p-2 text-foreground hover:text-primary transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Single Scrollable Container for All Menu Items */}
              <div className="flex-1 overflow-y-auto">
                {/* Mobile Search */}
                <div className="p-4 border-b border-border">
                  <form onSubmit={(e) => { handleSearch(e); setShowMobileMenu(false); }}>
                    <Input
                      type="text"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      icon={<Search className="w-5 h-5" />}
                    />
                  </form>
                </div>

                {/* Navigation Links */}
                <div className="p-4 border-b border-border">
                  <div className="space-y-1">
                    {navigation.map((item) => {
                      const isActive = pathname === item.href || 
                        (item.href !== '/' && pathname?.startsWith(item.href));
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => setShowMobileMenu(false)}
                          className={`block px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                            isActive
                              ? 'bg-primary text-primary-foreground'
                              : 'text-foreground hover:bg-background-secondary'
                          }`}
                        >
                          {item.name}
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* User Actions Section */}
                <div className="p-4 space-y-1">
                  {/* Cart Link */}
                  <Link
                    href="/cart"
                    onClick={() => setShowMobileMenu(false)}
                    className="flex items-center justify-between px-4 py-3 rounded-lg text-foreground hover:bg-background-secondary transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <ShoppingCart className="w-5 h-5" />
                      <span className="font-medium">Cart</span>
                    </div>
                    {itemCount > 0 && (
                      <span className="bg-primary text-primary-foreground text-xs font-bold rounded-full min-w-[24px] h-6 flex items-center justify-center px-2">
                        {itemCount}
                      </span>
                    )}
                  </Link>

                  {/* Notifications Link */}
                  {user && (
                    <Link
                      href="/notifications"
                      onClick={() => setShowMobileMenu(false)}
                      className="flex items-center justify-between px-4 py-3 rounded-lg text-foreground hover:bg-background-secondary transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Bell className="w-5 h-5" />
                        <span className="font-medium">Notifications</span>
                      </div>
                      {unreadCount > 0 && (
                        <span className="bg-primary text-primary-foreground text-xs font-bold rounded-full min-w-[24px] h-6 flex items-center justify-center px-2">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </Link>
                  )}

                  {/* User Menu Items */}
                  {user ? (
                    <>
                      {(userRole === UserRole.ADMIN || userRole === UserRole.STAFF) && (
                        <Link
                          href="/admin"
                          onClick={() => setShowMobileMenu(false)}
                          className="flex items-center gap-3 px-4 py-3 rounded-lg text-foreground hover:bg-background-secondary transition-colors"
                        >
                          <LayoutDashboard className="w-5 h-5" />
                          <span className="font-medium">Admin Dashboard</span>
                        </Link>
                      )}
                      <Link
                        href="/profile"
                        onClick={() => setShowMobileMenu(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-foreground hover:bg-background-secondary transition-colors"
                      >
                        <UserIcon className="w-5 h-5" />
                        <span className="font-medium">Profile</span>
                      </Link>
                      <Link
                        href="/settings"
                        onClick={() => setShowMobileMenu(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-foreground hover:bg-background-secondary transition-colors"
                      >
                        <SettingsIcon className="w-5 h-5" />
                        <span className="font-medium">Settings</span>
                      </Link>
                      <button
                        onClick={async () => {
                          setShowMobileMenu(false);
                          try {
                            await signOut();
                            await logout();
                            window.location.href = '/';
                          } catch (error) {
                            console.error('Error signing out:', error);
                            window.location.href = '/';
                          }
                        }}
                        className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-foreground hover:bg-background-secondary transition-colors text-left"
                      >
                        <LogOutIcon className="w-5 h-5" />
                        <span className="font-medium">Logout</span>
                      </button>
                    </>
                  ) : (
                    <Link
                      href="/login"
                      onClick={() => setShowMobileMenu(false)}
                      className="block w-full"
                    >
                      <Button variant="outline" className="w-full">
                        Sign In
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

