/**
 * Cost Control Settings Section
 * Allows admin to control Firestore costs through granular settings
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Button, Input, Switch } from '@/components/ui';
import { Save, Info, Zap, Bell, FileText, Database, TrendingUp } from 'lucide-react';
import { getSettings, upsertSettings } from '@/lib/settings';
import { 
  Settings, 
  RealtimeOptions, 
  NotificationOptions, 
  LedgerOptions, 
  DocumentCreationOptions, 
  PerformanceOptions 
} from '@/types/settings';
import { getDefaultSettings } from '@/lib/settings/defaults';
import { getUserFriendlyMessage } from '@/lib/utils/user-messages';

interface CostControlSectionProps {
  onSave?: () => void;
}

export const CostControlSection: React.FC<CostControlSectionProps> = ({ onSave }) => {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('realtime');

  const [realtime, setRealtime] = useState<RealtimeOptions>(getDefaultSettings().realtime!);
  const [notifications, setNotifications] = useState<NotificationOptions>(getDefaultSettings().notifications!);
  const [ledger, setLedger] = useState<LedgerOptions>(getDefaultSettings().ledger!);
  const [documentCreation, setDocumentCreation] = useState<DocumentCreationOptions>(getDefaultSettings().documentCreation!);
  const [performance, setPerformance] = useState<PerformanceOptions>(getDefaultSettings().performance!);

  // Load existing settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const existing = await getSettings();
        if (existing) {
          if (existing.realtime) setRealtime(existing.realtime);
          if (existing.notifications) setNotifications(existing.notifications);
          if (existing.ledger) setLedger(existing.ledger);
          if (existing.documentCreation) setDocumentCreation(existing.documentCreation);
          if (existing.performance) setPerformance(existing.performance);
        }
      } catch (err) {
        console.error('Error loading cost control settings:', err);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const currentSettings = await getSettings();
      const settingsToSave: Partial<Settings> = {
        ...currentSettings,
        realtime,
        notifications,
        ledger,
        documentCreation,
        performance,
      };

      await upsertSettings(settingsToSave as Omit<Settings, 'id' | 'createdAt' | 'updatedAt'>);
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      onSave?.();
    } catch (err) {
      console.error('Error saving cost control settings:', err);
      const errorMessage = getUserFriendlyMessage(err instanceof Error ? err?.message : 'Error saving cost control settings');
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const sections = [
    { id: 'realtime', label: 'Realtime Listeners', icon: Zap },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'ledger', label: 'Ledger', icon: FileText },
    { id: 'documents', label: 'Document Creation', icon: Database },
    { id: 'performance', label: 'Performance', icon: TrendingUp },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Cost Control Settings</h2>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Optimize Firestore usage to reduce costs and avoid hitting limits
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} isLoading={saving} className="w-full sm:w-auto">
          <Save className="w-4 h-4 mr-2" />
          Save All Settings
        </Button>
      </div>

      {error && (
        <div className="p-3 sm:p-4 bg-destructive/20 text-destructive rounded-lg text-sm sm:text-base">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 sm:p-4 bg-success/20 text-success rounded-lg text-sm sm:text-base">
          Cost control settings saved successfully!
        </div>
      )}

      {/* Section Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg whitespace-nowrap transition-colors text-xs sm:text-sm ${
                activeSection === section.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background-secondary text-text-secondary hover:bg-background hover:text-foreground'
              }`}
            >
              <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="font-medium">{section.label}</span>
            </button>
          );
        })}
      </div>

      {/* Realtime Listeners Section */}
      {activeSection === 'realtime' && (
        <div className="bg-card rounded-lg border border-border p-4 sm:p-5 md:p-6 space-y-4 sm:space-y-6">
          <div className="flex items-start gap-2 sm:gap-3">
            <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-primary mt-0.5 sm:mt-1 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg sm:text-xl font-bold text-foreground mb-1 sm:mb-2">Realtime Listeners</h3>
              <p className="text-xs sm:text-sm text-text-secondary">
                Control which collections use realtime listeners. Disabled collections will use polling instead.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <Switch
              checked={realtime.enabled}
              onChange={(checked) => setRealtime({ ...realtime, enabled: checked })}
              label="Enable Realtime Listeners Globally"
            />
            <p className="text-xs text-text-secondary ml-0 sm:ml-6 mt-1">
              When disabled, all collections will use polling. When enabled, you can control individual collections below.
            </p>

            {realtime.enabled && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-4 sm:mt-6">
                  <Switch
                    checked={realtime.orders}
                    onChange={(checked) => setRealtime({ ...realtime, orders: checked })}
                    label="Orders"
                  />
                  <Switch
                    checked={realtime.bookings}
                    onChange={(checked) => setRealtime({ ...realtime, bookings: checked })}
                    label="Bookings"
                  />
                  <Switch
                    checked={realtime.products}
                    onChange={(checked) => setRealtime({ ...realtime, products: checked })}
                    label="Products"
                  />
                  <Switch
                    checked={realtime.services}
                    onChange={(checked) => setRealtime({ ...realtime, services: checked })}
                    label="Services"
                  />
                  <Switch
                    checked={realtime.customers}
                    onChange={(checked) => setRealtime({ ...realtime, customers: checked })}
                    label="Customers"
                  />
                  <Switch
                    checked={realtime.notifications}
                    onChange={(checked) => setRealtime({ ...realtime, notifications: checked })}
                    label="Notifications"
                  />
                  <Switch
                    checked={realtime.payments}
                    onChange={(checked) => setRealtime({ ...realtime, payments: checked })}
                    label="Payments"
                  />
                  <Switch
                    checked={realtime.ledger}
                    onChange={(checked) => setRealtime({ ...realtime, ledger: checked })}
                    label="Ledger"
                  />
                  <Switch
                    checked={realtime.categories}
                    onChange={(checked) => setRealtime({ ...realtime, categories: checked })}
                    label="Categories"
                  />
                  <Switch
                    checked={realtime.deliveryProviders}
                    onChange={(checked) => setRealtime({ ...realtime, deliveryProviders: checked })}
                    label="Delivery Providers"
                  />
                  <Switch
                    checked={realtime.reviews}
                    onChange={(checked) => setRealtime({ ...realtime, reviews: checked })}
                    label="Reviews"
                  />
                  <Switch
                    checked={realtime.promotions}
                    onChange={(checked) => setRealtime({ ...realtime, promotions: checked })}
                    label="Promotions"
                  />
                </div>

                <div className="mt-6">
                  <Input
                    label="Polling Interval (seconds)"
                    type="number"
                    value={realtime.pollingInterval || 30}
                    onChange={(e) => setRealtime({ ...realtime, pollingInterval: parseInt(e.target.value) || 30 })}
                    min={10}
                    max={300}
                  />
                  <p className="text-xs text-text-secondary mt-1">
                    How often to poll for updates when realtime is disabled (10-300 seconds)
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 sm:p-4">
            <div className="flex items-start gap-2 sm:gap-3">
              <Info className="w-4 h-4 sm:w-5 sm:h-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="text-xs sm:text-sm text-text-secondary">
                <p className="font-medium text-foreground mb-1">Cost Impact:</p>
                <p>Realtime listeners consume reads on every document change. Disabling them reduces read costs but increases latency.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Section */}
      {activeSection === 'notifications' && (
        <div className="bg-card rounded-lg border border-border p-4 sm:p-5 md:p-6 space-y-4 sm:space-y-6">
          <div className="flex items-start gap-2 sm:gap-3">
            <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-primary mt-0.5 sm:mt-1 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg sm:text-xl font-bold text-foreground mb-1 sm:mb-2">Notification Controls</h3>
              <p className="text-xs sm:text-sm text-text-secondary">
                Control which notifications are created. Only critical notifications are enabled by default.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <Switch
              checked={notifications.enabled}
              onChange={(checked) => setNotifications({ ...notifications, enabled: checked })}
              label="Enable Notifications Globally"
            />

            {notifications.enabled && (
              <>
                <div className="border-t border-border pt-4 mt-4">
                  <h4 className="font-semibold text-foreground mb-3">Critical Notifications</h4>
                  <div className="space-y-3">
                    <Switch
                      checked={notifications.orderPaid}
                      onChange={(checked) => setNotifications({ ...notifications, orderPaid: checked })}
                      label="Order Paid"
                    />
                    <Switch
                      checked={notifications.bookingPaid}
                      onChange={(checked) => setNotifications({ ...notifications, bookingPaid: checked })}
                      label="Booking Paid"
                    />
                    <Switch
                      checked={notifications.orderCompleted}
                      onChange={(checked) => setNotifications({ ...notifications, orderCompleted: checked })}
                      label="Order Completed"
                    />
                    <Switch
                      checked={notifications.bookingCompleted}
                      onChange={(checked) => setNotifications({ ...notifications, bookingCompleted: checked })}
                      label="Booking Completed"
                    />
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <h4 className="font-semibold text-foreground mb-2 sm:mb-3 text-sm sm:text-base">Optional Notifications</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Switch
                      checked={notifications.paymentSuccess}
                      onChange={(checked) => setNotifications({ ...notifications, paymentSuccess: checked })}
                      label="Payment Success"
                    />
                    <Switch
                      checked={notifications.paymentFailed}
                      onChange={(checked) => setNotifications({ ...notifications, paymentFailed: checked })}
                      label="Payment Failed"
                    />
                    <Switch
                      checked={notifications.orderCreated}
                      onChange={(checked) => setNotifications({ ...notifications, orderCreated: checked })}
                      label="Order Created"
                    />
                    <Switch
                      checked={notifications.orderShipped}
                      onChange={(checked) => setNotifications({ ...notifications, orderShipped: checked })}
                      label="Order Shipped"
                    />
                    <Switch
                      checked={notifications.orderCanceled}
                      onChange={(checked) => setNotifications({ ...notifications, orderCanceled: checked })}
                      label="Order Canceled"
                    />
                    <Switch
                      checked={notifications.bookingCreated}
                      onChange={(checked) => setNotifications({ ...notifications, bookingCreated: checked })}
                      label="Booking Created"
                    />
                    <Switch
                      checked={notifications.bookingConfirmed}
                      onChange={(checked) => setNotifications({ ...notifications, bookingConfirmed: checked })}
                      label="Booking Confirmed"
                    />
                    <Switch
                      checked={notifications.bookingCanceled}
                      onChange={(checked) => setNotifications({ ...notifications, bookingCanceled: checked })}
                      label="Booking Canceled"
                    />
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <h4 className="font-semibold text-foreground mb-3">Notification Settings</h4>
                  <div className="space-y-4">
                    <Switch
                      checked={notifications.batchNotifications}
                      onChange={(checked) => setNotifications({ ...notifications, batchNotifications: checked })}
                      label="Batch Notifications"
                    />
                    <Input
                      label="Notification Retention (Days)"
                      type="number"
                      value={notifications.notificationRetentionDays}
                      onChange={(e) => setNotifications({ ...notifications, notificationRetentionDays: parseInt(e.target.value) || 90 })}
                      min={1}
                      max={365}
                      helpText="Auto-delete notifications older than this"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 sm:p-4">
            <div className="flex items-start gap-2 sm:gap-3">
              <Info className="w-4 h-4 sm:w-5 sm:h-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="text-xs sm:text-sm text-text-secondary">
                <p className="font-medium text-foreground mb-1">Cost Impact:</p>
                <p>Each notification creates a document write. Disabling optional notifications can significantly reduce write costs.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ledger Section */}
      {activeSection === 'ledger' && (
        <div className="bg-card rounded-lg border border-border p-4 sm:p-5 md:p-6 space-y-4 sm:space-y-6">
          <div className="flex items-start gap-2 sm:gap-3">
            <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-primary mt-0.5 sm:mt-1 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg sm:text-xl font-bold text-foreground mb-1 sm:mb-2">Ledger Controls</h3>
              <p className="text-xs sm:text-sm text-text-secondary">
                Control ledger entry creation. Manual generation creates entries from orders/bookings on-demand.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <Switch
              checked={ledger.enabled}
              onChange={(checked) => setLedger({ ...ledger, enabled: checked })}
              label="Enable Ledger Auto-Creation"
            />
            <p className="text-xs text-text-secondary ml-0 sm:ml-6 mt-1">
              When disabled, no ledger entries are automatically created. Use manual generation instead.
            </p>

            <Switch
              checked={ledger.manualGeneration}
              onChange={(checked) => setLedger({ ...ledger, manualGeneration: checked })}
              label="Enable Manual Generation"
            />
            <p className="text-xs text-text-secondary ml-0 sm:ml-6 mt-1">
              When enabled, generate ledger entries from orders/bookings on-demand based on status.
            </p>

            {ledger.manualGeneration && (
              <div className="border-t border-border pt-4 space-y-3">
                <Switch
                  checked={ledger.generateFromOrders}
                  onChange={(checked) => setLedger({ ...ledger, generateFromOrders: checked })}
                  label="Generate from Orders"
                />
                <Switch
                  checked={ledger.generateFromBookings}
                  onChange={(checked) => setLedger({ ...ledger, generateFromBookings: checked })}
                  label="Generate from Bookings"
                />
              </div>
            )}

            {ledger.enabled && !ledger.manualGeneration && (
              <div className="border-t border-border pt-4 space-y-3">
                <h4 className="font-semibold text-foreground text-sm sm:text-base">Auto-Creation Options</h4>
                <Switch
                  checked={ledger.paymentTransactions}
                  onChange={(checked) => setLedger({ ...ledger, paymentTransactions: checked })}
                  label="Payment Transactions"
                />
                <Switch
                  checked={ledger.refundTransactions}
                  onChange={(checked) => setLedger({ ...ledger, refundTransactions: checked })}
                  label="Refund Transactions"
                />
                <Switch
                  checked={ledger.adjustmentTransactions}
                  onChange={(checked) => setLedger({ ...ledger, adjustmentTransactions: checked })}
                  label="Adjustment Transactions"
                />
              </div>
            )}
          </div>

          <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 sm:p-4">
            <div className="flex items-start gap-2 sm:gap-3">
              <Info className="w-4 h-4 sm:w-5 sm:h-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="text-xs sm:text-sm text-text-secondary">
                <p className="font-medium text-foreground mb-1">Cost Impact:</p>
                <p>Manual generation eliminates all automatic ledger writes. Ledger can be generated from orders/bookings when needed.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Creation Section */}
      {activeSection === 'documents' && (
        <div className="bg-card rounded-lg border border-border p-4 sm:p-5 md:p-6 space-y-4 sm:space-y-6">
          <div className="flex items-start gap-2 sm:gap-3">
            <Database className="w-5 h-5 sm:w-6 sm:h-6 text-primary mt-0.5 sm:mt-1 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg sm:text-xl font-bold text-foreground mb-1 sm:mb-2">Document Creation Controls</h3>
              <p className="text-xs sm:text-sm text-text-secondary">
                Control automatic document creation for various features.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <Switch
              checked={documentCreation.createPaymentDocuments}
              onChange={(checked) => setDocumentCreation({ ...documentCreation, createPaymentDocuments: checked })}
              label="Create Payment Documents"
            />
            <Switch
              checked={documentCreation.createCustomerDocuments}
              onChange={(checked) => setDocumentCreation({ ...documentCreation, createCustomerDocuments: checked })}
              label="Auto-Create Customer Records"
            />
            <Switch
              checked={documentCreation.createReviewDocuments}
              onChange={(checked) => setDocumentCreation({ ...documentCreation, createReviewDocuments: checked })}
              label="Create Review Documents"
            />
            <Switch
              checked={documentCreation.enableReviews}
              onChange={(checked) => setDocumentCreation({ ...documentCreation, enableReviews: checked })}
              label="Enable Reviews Feature"
            />
            <p className="text-xs text-text-secondary ml-0 sm:ml-6 mt-1">
              When disabled, all review functionality is hidden and no review documents are created.
            </p>

            <div className="border-t border-border pt-4 space-y-4">
              <h4 className="font-semibold text-foreground text-sm sm:text-base">Retention Policies</h4>
              <Switch
                checked={documentCreation.autoDeleteOldNotifications}
                onChange={(checked) => setDocumentCreation({ ...documentCreation, autoDeleteOldNotifications: checked })}
                label="Auto-Delete Old Notifications"
              />
              <Input
                label="Notification Retention (Days)"
                type="number"
                value={documentCreation.notificationRetentionDays}
                onChange={(e) => setDocumentCreation({ ...documentCreation, notificationRetentionDays: parseInt(e.target.value) || 90 })}
                min={1}
                max={365}
              />
              <Switch
                checked={documentCreation.autoDeleteOldPayments}
                onChange={(checked) => setDocumentCreation({ ...documentCreation, autoDeleteOldPayments: checked })}
                label="Auto-Delete Old Payments"
              />
              <Input
                label="Payment Retention (Days)"
                type="number"
                value={documentCreation.paymentRetentionDays}
                onChange={(e) => setDocumentCreation({ ...documentCreation, paymentRetentionDays: parseInt(e.target.value) || 365 })}
                min={1}
                max={3650}
              />
            </div>
          </div>
        </div>
      )}

      {/* Performance Section */}
      {activeSection === 'performance' && (
        <div className="bg-card rounded-lg border border-border p-4 sm:p-5 md:p-6 space-y-4 sm:space-y-6">
          <div className="flex items-start gap-2 sm:gap-3">
            <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-primary mt-0.5 sm:mt-1 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg sm:text-xl font-bold text-foreground mb-1 sm:mb-2">Performance & Query Optimization</h3>
              <p className="text-xs sm:text-sm text-text-secondary">
                Optimize queries and data loading to reduce Firestore reads.
              </p>
            </div>
          </div>

          <div className="space-y-4 sm:space-y-6">
            <div className="border-b border-border pb-4">
              <h4 className="font-semibold text-foreground mb-2 sm:mb-3 text-sm sm:text-base">Pagination</h4>
              <Switch
                checked={performance.enablePagination}
                onChange={(checked) => setPerformance({ ...performance, enablePagination: checked })}
                label="Enable Pagination"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4">
                <Input
                  label="Default Page Size"
                  type="number"
                  value={performance.defaultPageSize}
                  onChange={(e) => setPerformance({ ...performance, defaultPageSize: parseInt(e.target.value) || 20 })}
                  min={10}
                  max={100}
                />
                <Input
                  label="Max Page Size"
                  type="number"
                  value={performance.maxPageSize}
                  onChange={(e) => setPerformance({ ...performance, maxPageSize: parseInt(e.target.value) || 100 })}
                  min={20}
                  max={500}
                />
              </div>
            </div>

            <div className="border-b border-border pb-4">
              <h4 className="font-semibold text-foreground mb-2 sm:mb-3 text-sm sm:text-base">Query Limits</h4>
              <Switch
                checked={performance.enforceQueryLimits}
                onChange={(checked) => setPerformance({ ...performance, enforceQueryLimits: checked })}
                label="Enforce Query Limits"
              />
              <p className="text-xs text-text-secondary ml-0 sm:ml-6 mt-1">
                When enabled, all queries must have a limit to prevent unlimited reads.
              </p>
              <Input
                label="Default Query Limit"
                type="number"
                value={performance.defaultQueryLimit}
                onChange={(e) => setPerformance({ ...performance, defaultQueryLimit: parseInt(e.target.value) || 50 })}
                min={10}
                max={500}
                className="mt-4"
              />
            </div>

            <div className="border-b border-border pb-4">
              <h4 className="font-semibold text-foreground mb-2 sm:mb-3 text-sm sm:text-base">Optimization Features</h4>
              <Switch
                checked={performance.enableFieldSelection}
                onChange={(checked) => setPerformance({ ...performance, enableFieldSelection: checked })}
                label="Enable Field Selection"
              />
              <Switch
                checked={performance.enableCache}
                onChange={(checked) => setPerformance({ ...performance, enableCache: checked })}
                label="Enable Query Caching"
              />
              {performance.enableCache && (
                <Input
                  label="Cache TTL (seconds)"
                  type="number"
                  value={performance.cacheTTL}
                  onChange={(e) => setPerformance({ ...performance, cacheTTL: parseInt(e.target.value) || 300 })}
                  min={60}
                  max={3600}
                />
              )}
              <Switch
                checked={performance.enableBatchWrites}
                onChange={(checked) => setPerformance({ ...performance, enableBatchWrites: checked })}
                label="Enable Batch Writes"
              />
              <Switch
                checked={performance.enableLazyRealtime}
                onChange={(checked) => setPerformance({ ...performance, enableLazyRealtime: checked })}
                label="Lazy Realtime Listeners"
              />
              <Input
                label="Realtime Debounce (ms)"
                type="number"
                value={performance.realtimeDebounceMs}
                onChange={(e) => setPerformance({ ...performance, realtimeDebounceMs: parseInt(e.target.value) || 500 })}
                min={0}
                max={5000}
              />
            </div>

            <div className="border-b border-border pb-4">
              <h4 className="font-semibold text-foreground mb-2 sm:mb-3 text-sm sm:text-base">Analytics Page</h4>
              <label className="block text-xs sm:text-sm font-medium text-foreground mb-2">
                Load Strategy
              </label>
              <select
                value={performance.analyticsLoadStrategy}
                onChange={(e) => setPerformance({ ...performance, analyticsLoadStrategy: e.target.value as 'all' | 'paginated' | 'lazy' })}
                className="w-full px-3 sm:px-4 py-2 text-sm border border-border rounded-lg bg-background text-foreground"
              >
                <option value="all">Load All (High Cost)</option>
                <option value="paginated">Paginated (Recommended)</option>
                <option value="lazy">Lazy Load (Lowest Cost)</option>
              </select>
              <Input
                label="Analytics Page Size"
                type="number"
                value={performance.analyticsPageSize}
                onChange={(e) => setPerformance({ ...performance, analyticsPageSize: parseInt(e.target.value) || 50 })}
                min={10}
                max={200}
                className="mt-4"
              />
            </div>
          </div>

          <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 sm:p-4">
            <div className="flex items-start gap-2 sm:gap-3">
              <Info className="w-4 h-4 sm:w-5 sm:h-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="text-xs sm:text-sm text-text-secondary">
                <p className="font-medium text-foreground mb-1">Cost Impact:</p>
                <p>These optimizations can reduce read costs by 50-90% depending on usage patterns. Pagination and query limits are especially effective for large datasets.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

