/**
 * Admin Guide Page
 * Comprehensive guide to help admins understand and use the admin panel
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Settings, Package, Briefcase, ShoppingCart, Calendar, 
  Users, BarChart3, FileText, BookOpen, HelpCircle, CheckCircle,
  AlertCircle, Info, CreditCard, Tags, Percent, Star, Bell
} from 'lucide-react';
import { Button } from '@/components/ui';
import { useStoreType } from '@/hooks/useStoreType';
import { cn } from '@/lib/utils/cn';

interface GuideSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

export default function AdminGuidePage() {
  const { hasProducts, hasServices } = useStoreType();

  const firstSteps: Array<{ step: number; title: string; description: string; link: string; linkText: string }> = [
    {
      step: 1,
      title: 'Configure Store Type',
      description: 'Choose whether you sell products, services, or both. This determines which features are available in your admin panel.',
      link: '/admin/settings?tab=store-type',
      linkText: 'Go to Store Type Settings'
    },
    {
      step: 2,
      title: 'Set Up Business Information',
      description: 'Add your business name, description, contact information, address, and opening hours. This information appears on your website.',
      link: '/admin/settings?tab=business',
      linkText: 'Configure Business Info'
    },
    {
      step: 3,
      title: 'Configure Payment Settings',
      description: 'Set up payment methods, currency, and tax rates. Configure how customers will pay for orders and bookings.',
      link: '/admin/settings?tab=payment',
      linkText: 'Set Up Payments'
    },
    {
      step: 4,
      title: 'Set Up Delivery (Products Only)',
      description: 'If you sell products, configure delivery providers, fees by region, and delivery options.',
      link: '/admin/settings?tab=delivery',
      linkText: 'Configure Delivery'
    },
    {
      step: 5,
      title: 'Create Categories',
      description: 'Organize your products and services into categories to help customers find what they need.',
      link: '/admin/categories/new',
      linkText: 'Create Category'
    },
    {
      step: 6,
      title: hasProducts ? 'Add Your First Product' : 'Add Your First Service',
      description: hasProducts 
        ? 'Start adding products to your store. Include descriptions, prices, images, and inventory levels.'
        : 'Start adding services to your booking system. Include descriptions, prices, images, and available time slots.',
      link: hasProducts ? '/admin/products/new' : '/admin/services/new',
      linkText: hasProducts ? 'Add Product' : 'Add Service'
    },
    
  ];

  const keyFeatures: GuideSection[] = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: <BarChart3 className="w-5 h-5" />,
      content: (
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">
            The dashboard provides an overview of your business performance with key metrics and charts.
          </p>
          <ul className="space-y-2 text-sm text-text-secondary list-disc list-inside">
            <li><strong>Revenue Metrics:</strong> Track net revenue, transaction fees, and revenue growth</li>
            <li><strong>Order/Booking Stats:</strong> {`View today's orders, pending bookings, and low stock alerts`}</li>
            <li><strong>Charts:</strong> Analyze revenue over time, top products/services, and earnings trends</li>
            <li><strong>Recent Activity:</strong> See the latest orders and bookings at a glance</li>
            <li><strong>Quick Actions:</strong> Fast access to commonly used features</li>
          </ul>
          <Link href="/admin" className="inline-flex items-center gap-2 text-primary hover:text-primary-hover text-sm font-medium">
            View Dashboard <ArrowLeft className="w-4 h-4 rotate-180" />
          </Link>
        </div>
      )
    },
    {
      id: 'products',
      title: 'Products Management',
      icon: <Package className="w-5 h-5" />,
      content: (
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">
            Manage your product catalog, inventory, pricing, and availability.
          </p>
          <ul className="space-y-2 text-sm text-text-secondary list-disc list-inside">
            <li><strong>Add/Edit Products:</strong> Create products with images, descriptions, variants, and pricing</li>
            <li><strong>Inventory Management:</strong> Track stock levels and receive low stock alerts</li>
            <li><strong>Product Variants:</strong> Create different sizes, colors, or options for products</li>
            <li><strong>Pricing:</strong> Set base prices and manage discounts</li>
            <li><strong>Product Status:</strong> Mark products as active or inactive</li>
          </ul>
          <Link href="/admin/products" className="inline-flex items-center gap-2 text-primary hover:text-primary-hover text-sm font-medium">
            Manage Products <ArrowLeft className="w-4 h-4 rotate-180" />
          </Link>
        </div>
      )
    },
    {
      id: 'services',
      title: 'Services Management',
      icon: <Briefcase className="w-5 h-5" />,
      content: (
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">
            Manage your service offerings, availability, pricing, and time slots.
          </p>
          <ul className="space-y-2 text-sm text-text-secondary list-disc list-inside">
            <li><strong>Add/Edit Services:</strong> Create services with descriptions, images, and pricing</li>
            <li><strong>Time Slots:</strong> Set available time slots for bookings</li>
            <li><strong>Duration:</strong> Define service duration and scheduling options</li>
            <li><strong>Service Status:</strong> Enable or disable services</li>
            <li><strong>Capacity:</strong> Set maximum bookings per time slot</li>
          </ul>
          <Link href="/admin/services" className="inline-flex items-center gap-2 text-primary hover:text-primary-hover text-sm font-medium">
            Manage Services <ArrowLeft className="w-4 h-4 rotate-180" />
          </Link>
        </div>
      )
    },
    {
      id: 'orders',
      title: 'Orders Management',
      icon: <ShoppingCart className="w-5 h-5" />,
      content: (
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">
            View, manage, and process customer orders from your store.
          </p>
          <ul className="space-y-2 text-sm text-text-secondary list-disc list-inside">
            <li><strong>Order Status:</strong> Update order status (Pending → Paid → Processing → Shipped → Completed)</li>
            <li><strong>Order Details:</strong> View customer information, items, payment status, and delivery address</li>
            <li><strong>Payment Tracking:</strong> Monitor payment status and transaction details</li>
            <li><strong>Order History:</strong> Access complete order history and search/filter orders</li>
            <li><strong>Notifications:</strong> Get notified of new orders and status changes</li>
          </ul>
          <Link href="/admin/orders" className="inline-flex items-center gap-2 text-primary hover:text-primary-hover text-sm font-medium">
            View Orders <ArrowLeft className="w-4 h-4 rotate-180" />
          </Link>
        </div>
      )
    },
    {
      id: 'bookings',
      title: 'Bookings Management',
      icon: <Calendar className="w-5 h-5" />,
      content: (
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">
            Manage customer service bookings, confirmations, and schedules.
          </p>
          <ul className="space-y-2 text-sm text-text-secondary list-disc list-inside">
            <li><strong>Booking Status:</strong> Update booking status (Pending → Confirmed → Completed/Cancelled)</li>
            <li><strong>Booking Details:</strong> View customer information, service details, time slot, and payment status</li>
            <li><strong>Calendar View:</strong> See all bookings in a calendar format</li>
            <li><strong>Confirmation:</strong> Confirm or cancel bookings with automatic notifications</li>
            <li><strong>Payment Tracking:</strong> Monitor booking payments and refunds</li>
          </ul>
          <Link href="/admin/bookings" className="inline-flex items-center gap-2 text-primary hover:text-primary-hover text-sm font-medium">
            View Bookings <ArrowLeft className="w-4 h-4 rotate-180" />
          </Link>
        </div>
      )
    },
    {
      id: 'categories',
      title: 'Categories',
      icon: <Tags className="w-5 h-5" />,
      content: (
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">
            Organize your products and services into categories for better navigation.
          </p>
          <ul className="space-y-2 text-sm text-text-secondary list-disc list-inside">
            <li><strong>Create Categories:</strong> Add categories with names and descriptions</li>
            <li><strong>Organize Items:</strong> Assign products/services to categories</li>
            <li><strong>Category Images:</strong> Add images to make categories more appealing</li>
            <li><strong>Hierarchical Structure:</strong> Create parent and child categories if needed</li>
          </ul>
          <Link href="/admin/categories" className="inline-flex items-center gap-2 text-primary hover:text-primary-hover text-sm font-medium">
            Manage Categories <ArrowLeft className="w-4 h-4 rotate-180" />
          </Link>
        </div>
      )
    },
    {
      id: 'promotions',
      title: 'Promotions & Discounts',
      icon: <Percent className="w-5 h-5" />,
      content: (
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">
            Create and manage promotions, discounts, and special offers.
          </p>
          <ul className="space-y-2 text-sm text-text-secondary list-disc list-inside">
            <li><strong>Create Promotions:</strong> Set up percentage or fixed amount discounts</li>
            <li><strong>Valid Dates:</strong> Set start and end dates for promotions</li>
            <li><strong>Applicable Items:</strong> Apply promotions to specific products, services, or categories</li>
            <li><strong>Promotion Codes:</strong> Create discount codes for customers to use</li>
            <li><strong>Active Status:</strong> Enable or disable promotions</li>
          </ul>
          <Link href="/admin/promotions" className="inline-flex items-center gap-2 text-primary hover:text-primary-hover text-sm font-medium">
            Manage Promotions <ArrowLeft className="w-4 h-4 rotate-180" />
          </Link>
        </div>
      )
    },
    {
      id: 'customers',
      title: 'Customers',
      icon: <Users className="w-5 h-5" />,
      content: (
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">
            View and manage customer accounts and information.
          </p>
          <ul className="space-y-2 text-sm text-text-secondary list-disc list-inside">
            <li><strong>Customer List:</strong> View all registered customers</li>
            <li><strong>Customer Details:</strong> See customer profiles, order history, and booking history</li>
            <li><strong>Contact Information:</strong> Access customer email and phone numbers</li>
            <li><strong>Account Status:</strong> View active/inactive customer status</li>
          </ul>
          <Link href="/admin/customers" className="inline-flex items-center gap-2 text-primary hover:text-primary-hover text-sm font-medium">
            View Customers <ArrowLeft className="w-4 h-4 rotate-180" />
          </Link>
        </div>
      )
    },
    {
      id: 'payments',
      title: 'Payments',
      icon: <CreditCard className="w-5 h-5" />,
      content: (
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">
            Track and manage all payment transactions.
          </p>
          <ul className="space-y-2 text-sm text-text-secondary list-disc list-inside">
            <li><strong>Payment History:</strong> View all payment transactions</li>
            <li><strong>Payment Status:</strong> Monitor payment status (pending, completed, failed, refunded)</li>
            <li><strong>Payment Methods:</strong> See which payment methods customers used</li>
            <li><strong>Transaction Details:</strong> Access detailed transaction information</li>
            <li><strong>Refunds:</strong> Process refunds when needed</li>
          </ul>
          <Link href="/admin/payments" className="inline-flex items-center gap-2 text-primary hover:text-primary-hover text-sm font-medium">
            View Payments <ArrowLeft className="w-4 h-4 rotate-180" />
          </Link>
        </div>
      )
    },
    {
      id: 'analytics',
      title: 'Analytics',
      icon: <BarChart3 className="w-5 h-5" />,
      content: (
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">
            Analyze your business performance with detailed analytics and reports.
          </p>
          <ul className="space-y-2 text-sm text-text-secondary list-disc list-inside">
            <li><strong>Revenue Analytics:</strong> Track revenue trends and patterns</li>
            <li><strong>Sales Reports:</strong> View sales by product, service, category, or time period</li>
            <li><strong>Customer Analytics:</strong> Understand customer behavior and preferences</li>
            <li><strong>Performance Metrics:</strong> Monitor key performance indicators (KPIs)</li>
          </ul>
          <Link href="/admin/analytics" className="inline-flex items-center gap-2 text-primary hover:text-primary-hover text-sm font-medium">
            View Analytics <ArrowLeft className="w-4 h-4 rotate-180" />
          </Link>
        </div>
      )
    },
    {
      id: 'reports',
      title: 'Reports',
      icon: <FileText className="w-5 h-5" />,
      content: (
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">
            Generate and view business reports for analysis and record-keeping.
          </p>
          <ul className="space-y-2 text-sm text-text-secondary list-disc list-inside">
            <li><strong>Sales Reports:</strong> Generate sales reports for specific time periods</li>
            <li><strong>Financial Reports:</strong> View financial summaries and breakdowns</li>
            <li><strong>Export Data:</strong> Export reports for external analysis</li>
          </ul>
          <Link href="/admin/reports" className="inline-flex items-center gap-2 text-primary hover:text-primary-hover text-sm font-medium">
            View Reports <ArrowLeft className="w-4 h-4 rotate-180" />
          </Link>
        </div>
      )
    },
    {
      id: 'ledger',
      title: 'Ledger',
      icon: <BookOpen className="w-5 h-5" />,
      content: (
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">
            Track all financial transactions in an immutable ledger.
          </p>
          <ul className="space-y-2 text-sm text-text-secondary list-disc list-inside">
            <li><strong>Financial Records:</strong> View all income and expense entries</li>
            <li><strong>Transaction History:</strong> Complete record of all financial transactions</li>
            <li><strong>Automatic Entries:</strong> Ledger entries are automatically created for orders and bookings</li>
            <li><strong>Immutable Records:</strong> Ledger entries cannot be modified or deleted for accuracy</li>
          </ul>
          <Link href="/admin/ledger" className="inline-flex items-center gap-2 text-primary hover:text-primary-hover text-sm font-medium">
            View Ledger <ArrowLeft className="w-4 h-4 rotate-180" />
          </Link>
        </div>
      )
    },
    {
      id: 'reviews',
      title: 'Reviews',
      icon: <Star className="w-5 h-5" />,
      content: (
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">
            Manage customer reviews and ratings for your products and services.
          </p>
          <ul className="space-y-2 text-sm text-text-secondary list-disc list-inside">
            <li><strong>Review Management:</strong> View and moderate customer reviews</li>
            <li><strong>Ratings:</strong> See average ratings and individual reviews</li>
            <li><strong>Response:</strong> Respond to customer reviews</li>
            <li><strong>Review Status:</strong> Approve or hide reviews if needed</li>
          </ul>
          <Link href="/admin/reviews" className="inline-flex items-center gap-2 text-primary hover:text-primary-hover text-sm font-medium">
            View Reviews <ArrowLeft className="w-4 h-4 rotate-180" />
          </Link>
        </div>
      )
    },
    {
      id: 'settings',
      title: 'Settings',
      icon: <Settings className="w-5 h-5" />,
      content: (
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">
            Configure all aspects of your store and business.
          </p>
          <ul className="space-y-2 text-sm text-text-secondary list-disc list-inside">
            <li><strong>Store Type:</strong> Configure whether you sell products, services, or both</li>
            <li><strong>Business Information:</strong> Update business details, contact info, and address</li>
            <li><strong>Branding:</strong> Upload logo and banner images</li>
            <li><strong>Payment Configuration:</strong> Set up payment methods and tax rates</li>
            <li><strong>Delivery Settings:</strong> Configure delivery providers and fees</li>
            <li><strong>Staff Management:</strong> Add and manage staff accounts with permissions</li>
            <li><strong>Cost Control:</strong> Set transaction fee rates and cost management</li>
            <li><strong>Analytics:</strong> Configure analytics tracking</li>
          </ul>
          <Link href="/admin/settings" className="inline-flex items-center gap-2 text-primary hover:text-primary-hover text-sm font-medium">
            Go to Settings <ArrowLeft className="w-4 h-4 rotate-180" />
          </Link>
        </div>
      )
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <Link 
          href="/admin" 
          className="inline-flex items-center gap-2 text-text-secondary hover:text-foreground mb-4 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 bg-primary/10 rounded-lg">
            <HelpCircle className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Admin Guide</h1>
            <p className="text-sm sm:text-base text-text-secondary">
              Everything you need to know about using the admin panel effectively
            </p>
          </div>
        </div>
      </div>

      {/* First Steps Section */}
      <section className="bg-card rounded-lg border border-border p-4 sm:p-6 mb-6 sm:mb-8">
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
          <CheckCircle className="w-6 h-6 text-primary" />
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">First Steps</h2>
        </div>
        <p className="text-sm sm:text-base text-text-secondary mb-4 sm:mb-6">
          Follow these steps to get your store up and running. Complete them in order for the best experience.
        </p>
        <div className="space-y-4">
          {firstSteps.map((step, index) => (
            <div
              key={step.step}
              className={cn(
                'p-4 rounded-lg border transition-colors',
                'bg-background-secondary border-border hover:border-primary/50'
              )}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                  {step.step}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-text-secondary mb-3">
                    {step.description}
                  </p>
                  <Link href={step.link}>
                    <Button variant="outline" size="sm" className="w-full sm:w-auto">
                      {step.linkText}
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Key Features Section */}
      <section className="bg-card rounded-lg border border-border p-4 sm:p-6 mb-6 sm:mb-8">
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
          <Info className="w-6 h-6 text-primary" />
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Key Features & Where to Find Them</h2>
        </div>
        <p className="text-sm sm:text-base text-text-secondary mb-4 sm:mb-6">
          Learn about the main features of the admin panel and how to use them effectively.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {keyFeatures
            .filter(feature => {
              // Filter based on store type
              if (feature.id === 'products' && !hasProducts) return false;
              if (feature.id === 'services' && !hasServices) return false;
              if (feature.id === 'orders' && !hasProducts) return false;
              if (feature.id === 'bookings' && !hasServices) return false;
              return true;
            })
            .map((feature) => (
              <div
                key={feature.id}
                className="p-4 rounded-lg border border-border bg-background-secondary hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">{feature.title}</h3>
                </div>
                {feature.content}
              </div>
            ))}
        </div>
      </section>

      {/* Important Notes Section */}
      <section className="bg-card rounded-lg border border-border p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
          <AlertCircle className="w-6 h-6 text-warning" />
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Important Notes</h2>
        </div>
        <div className="space-y-4">
          <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <h3 className="font-semibold text-foreground mb-2 text-base">Security & Access</h3>
            <ul className="space-y-2 text-sm text-text-secondary list-disc list-inside">
              <li>Only admin users can access the admin panel</li>
              <li>Staff users have limited access based on their permissions</li>
              <li>Your account security is protected with reCAPTCHA and login attempt limits</li>
              <li>Always log out when using shared computers</li>
            </ul>
          </div>

          <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
            <h3 className="font-semibold text-foreground mb-2 text-base">Data Management</h3>
            <ul className="space-y-2 text-sm text-text-secondary list-disc list-inside">
              <li>Orders and bookings are permanent records and cannot be deleted</li>
              <li>Payments and ledger entries are immutable for financial accuracy</li>
              <li>You can reset business data (products, services, categories, promotions) from Settings → Reset Data</li>
              <li>Backup important data regularly if needed</li>
            </ul>
          </div>

          <div className="p-4 bg-info/10 border border-info/20 rounded-lg">
            <h3 className="font-semibold text-foreground mb-2 text-base">Notifications</h3>
            <ul className="space-y-2 text-sm text-text-secondary list-disc list-inside">
              <li>{`You'll receive notifications for new orders and bookings`}</li>
              <li>Check the notification bell icon in the top navigation for updates</li>
              <li>Notifications help you stay on top of customer requests</li>
            </ul>
          </div>

          <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
            <h3 className="font-semibold text-foreground mb-2 text-base">Tips for Success</h3>
            <ul className="space-y-2 text-sm text-text-secondary list-disc list-inside">
              <li>Keep product/service information up to date with accurate descriptions and prices</li>
              <li>Respond promptly to orders and bookings to maintain customer satisfaction</li>
              <li>Regularly check analytics to understand your business performance</li>
              <li>Use promotions strategically to boost sales</li>
              <li>Monitor inventory levels to avoid stockouts</li>
              <li>Keep your business information and settings current</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

