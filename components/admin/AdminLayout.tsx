/**
 * Admin layout with sidebar navigation
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Home, Package, Briefcase, ShoppingCart, Calendar, Users, 
  BarChart3, FileText, Settings, BookOpen, MessageCircle, 
  Search, Bell, Tags, Percent, CreditCard, Star, Menu, X, HelpCircle, Play
} from 'lucide-react';
import { Logo } from '@/components/branding';
import { AdminContact } from '@/components/admin/AdminContact';
import { AdminAiModal } from '@/components/admin/AdminAiModal';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/user';
import { cn } from '@/lib/utils/cn';
import { useNotifications, useNotificationsByUserId } from '@/hooks/useNotifications';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { useStoreType } from '@/hooks/useStoreType';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userRole, logout } = useAuth();
  const { hasProducts, hasServices } = useStoreType();
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  
  // Get all notifications for admin (not just user-specific ones)
  const { data: allNotifications = [] } = useNotifications({
    enabled: !!user && (userRole === UserRole.ADMIN || userRole === UserRole.STAFF),
  });
  
  // Real-time updates for notifications (critical data - admin needs immediate updates)
  useRealtimeNotifications({
    enabled: !!user && (userRole === UserRole.ADMIN || userRole === UserRole.STAFF),
  });
  
  // Filter for unread notifications
  const unreadCount = allNotifications.filter(n => !n.readAt).length;
  console.log("Admin unread count:", unreadCount, "Total notifications:", allNotifications.length);

  // Build navigation items based on store type
  const navItems: NavItem[] = [
    { label: 'Dashboard', href: '/admin', icon: <Home className="w-5 h-5" /> },
    ...(hasProducts ? [{ label: 'Products', href: '/admin/products', icon: <Package className="w-5 h-5" /> }] : []),
    ...(hasServices ? [{ label: 'Services', href: '/admin/services', icon: <Briefcase className="w-5 h-5" /> }] : []),
    { label: 'Categories', href: '/admin/categories', icon: <Tags className="w-5 h-5" /> },
    { label: 'Promotions', href: '/admin/promotions', icon: <Percent className="w-5 h-5" /> },
    ...(hasProducts ? [{ label: 'Orders', href: '/admin/orders', icon: <ShoppingCart className="w-5 h-5" /> }] : []),
    ...(hasServices ? [{ label: 'Bookings', href: '/admin/bookings', icon: <Calendar className="w-5 h-5" /> }] : []),
    { label: 'Payments', href: '/admin/payments', icon: <CreditCard className="w-5 h-5" /> },
    { label: 'Customers', href: '/admin/customers', icon: <Users className="w-5 h-5" /> },
    { label: 'Reviews', href: '/admin/reviews', icon: <Star className="w-5 h-5" /> },
    { label: 'Analytics', href: '/admin/analytics', icon: <BarChart3 className="w-5 h-5" /> },
    { label: 'Reports', href: '/admin/reports', icon: <FileText className="w-5 h-5" /> },
    { label: 'Ledger', href: '/admin/ledger', icon: <BookOpen className="w-5 h-5" /> },
    { label: 'Settings', href: '/admin/settings', icon: <Settings className="w-5 h-5" /> },
  ];

  const [aiOpen, setAiOpen] = useState(false);

  const handleLogout = async () => {
    try {
      // Sign out from Firebase
      const { signOut } = await import('@/lib/auth');
      await signOut();
      
      // Call context logout for state cleanup (includes React Query cache clearing)
      await logout();
      
      // Redirect to login page
      router.push('/admin');
      
      // Force a hard navigation to ensure state is cleared
      window.location.href = '/admin';
    } catch (error) {
      console.error('Error signing out:', error);
      // Even if there's an error, try to redirect
      router.push('/admin');
      window.location.href = '/admin';
    }
  };

  // Close mobile menu when clicking a nav link
  const handleNavClick = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-background-secondary relative">
      {/* Mobile Menu Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[60] lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-full w-64 bg-card border-r border-border z-[70]',
          'transform transition-transform duration-300 ease-in-out',
          // Desktop: always visible
          'lg:translate-x-0',
          // Mobile: hidden by default, slide in when open
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo with Close Button (Mobile Only) */}
          <div className="p-6 border-b border-border flex items-center justify-between">
            <Logo href="/admin" size="md" />
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden p-2 text-text-secondary hover:text-foreground transition-colors"
              aria-label="Close menu"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-2">
              {navItems.map((item) => {
                // Use URL asPath for proper matching, normalize trailing slashes
                const normalizePath = (path: string) =>
                  path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path;

                const currentPath = normalizePath(pathname || '');
                const navPath = normalizePath(item.href);

                // for /admin, only match exactly /admin, not /admin/...
                const isActive =
                  navPath === '/admin'
                    ? currentPath === navPath
                    : currentPath.startsWith(navPath + '/') || currentPath === navPath;
                
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={handleNavClick}
                      className={
                        `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                        ${isActive
                          ? 'bg-primary !text-primary-foreground'
                          : 'text-text-secondary hover:bg-background-secondary hover:text-foreground'
                      }`}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      {item.icon}
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  </li>
                );

              })}
            </ul>
          </nav>

          {/* Help & Support */}
          <div className="p-4 border-t border-border">
            <AdminContact onOpenAi={() => setAiOpen(true)} />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-card border-b border-border">
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 gap-4">
            {/* Hamburger Menu Button (Mobile Only) */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 text-text-secondary hover:text-foreground transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="flex-1 max-w-xl">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search components..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-base"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-muted" />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Link
                href="/admin/watch"
                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm text-primary hover:text-primary-hover hover:bg-primary/10 rounded-lg transition-colors"
              >
                <Play className="w-4 h-4" />
                <span className="hidden sm:inline">Watch</span>
              </Link>
               <Link
                  href="/admin/guide"
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm text-primary hover:text-primary-hover hover:bg-primary/10 rounded-lg transition-colors"
                >
                  <HelpCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">Guide</span>
                </Link>
              {/* Notifications */}
              <Link
                href="/admin/notifications"
                className="relative p-2 text-text-secondary hover:text-foreground transition-colors"
              >
                <Bell className="w-6 h-6" />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 min-w-[1.25rem] h-5 px-1 bg-primary rounded-full text-xs text-primary-foreground flex items-center justify-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>

              {/* User Menu */}
              {user && (
                <div className="relative group">
                  {/* Mobile backdrop */}
                  {isUserMenuOpen && (
                    <div
                      className="fixed inset-0 z-[35] lg:hidden"
                      onClick={() => setIsUserMenuOpen(false)}
                      aria-hidden="true"
                    />
                  )}
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="w-10 h-10 rounded-full bg-background-secondary flex items-center justify-center text-foreground font-semibold hover:bg-background-tertiary transition-colors"
                    aria-label="User menu"
                    aria-expanded={isUserMenuOpen}
                  >
                    {user?.displayName?.[0].toUpperCase() || user?.email?.[0].toUpperCase() || 'P'}
                  </button>
                  <div
                    className={cn(
                      'absolute right-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-lg z-[40] transition-all',
                      // Desktop: show on hover OR when clicked
                      'lg:opacity-0 lg:invisible lg:group-hover:opacity-100 lg:group-hover:visible',
                      isUserMenuOpen && 'lg:opacity-100 lg:visible',
                      // Mobile: show based on state only
                      isUserMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
                    )}
                  >
                    <div className="p-4 border-b border-border">
                      <p className="font-medium text-foreground">{user?.displayName || 'Admin'}</p>
                      <p className="text-sm text-text-secondary break-all">{user?.email}</p>
                    </div>
                    <div className="p-2">
                      <Link
                        href="/admin/profile"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="block px-3 py-2 text-sm text-text-secondary hover:bg-background-secondary rounded-lg transition-colors"
                      >
                        Profile
                      </Link>
                      <Link
                        href="/admin/settings"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="block px-3 py-2 text-sm text-text-secondary hover:bg-background-secondary rounded-lg transition-colors"
                      >
                        Settings
                      </Link>
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          handleLogout();
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-background-secondary rounded-lg transition-colors"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-6">
          {children}
        </main>

        {/* Admin AI Modal (renders at top-level of layout so it centers in app) */}
        <AdminAiModal open={aiOpen} onClose={() => setAiOpen(false)} />
      </div>
    </div>
  );
};

