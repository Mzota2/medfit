/**
 * Admin Notifications Page
 * Full CRUD and real-time notifications management
 */

'use client';

import React, { useState, useMemo } from 'react';
import { useNotifications, useRealtimeNotifications, useMarkNotificationAsRead } from '@/hooks';
import { NotificationType, NotificationChannel, NotificationDeliveryStatus } from '@/types/notification';
import { Button, Modal, Loading } from '@/components/ui';
import { Bell, Search, Trash2, Eye, Check, X, Mail, Smartphone, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { formatDate } from '@/lib/utils/formatting';
import { Notification } from '@/types/notification';
import { Timestamp } from 'firebase/firestore';

// Helper to convert date safely
const getDate = (date: Date | string | Timestamp | { toDate?: () => Date } | undefined): Date => {
  if (!date) return new Date(0);
  if (date instanceof Date) return date;
  if (date instanceof Timestamp) return date.toDate();
  if (typeof date === 'object' && 'toDate' in date && typeof date.toDate === 'function') {
    return date.toDate();
  }
  return new Date(date as string);
};

export default function AdminNotificationsPage() {
  const [selectedType, setSelectedType] = useState<NotificationType | 'all'>('all');
  const [selectedChannel, setSelectedChannel] = useState<NotificationChannel | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<NotificationDeliveryStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingNotification, setViewingNotification] = useState<Notification | null>(null);
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());

  // Fetch notifications with React Query
  const {
    data: items = [],
    isLoading: loading,
    error,
  } = useNotifications({
    limit: 1000,
  });

  // Real-time updates
  useRealtimeNotifications({
    limit: 1000,
  });

  // Mutations
  const markAsRead = useMarkNotificationAsRead();

  const filteredNotifications = useMemo(() => {
    let filtered = items;

    if (selectedType !== 'all') {
      filtered = filtered.filter((n) => n.type === selectedType);
    }

    if (selectedChannel !== 'all') {
      filtered = filtered.filter((n) => n.channels.includes(selectedChannel));
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter((n) => {
        const status = n.deliveryStatus[selectedChannel === 'all' ? NotificationChannel.IN_APP : selectedChannel];
        return status === selectedStatus;
      });
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (n) =>
          n.title.toLowerCase().includes(query) ||
          n.body.toLowerCase().includes(query) ||
          n.recipient.email.toLowerCase().includes(query)
      );
    }

    return filtered.sort((a, b) => {
      const aDate = getDate(a.createdAt);
      const bDate = getDate(b.createdAt);
      return bDate.getTime() - aDate.getTime();
    });
  }, [items, selectedType, selectedChannel, selectedStatus, searchQuery]);

  const unreadCount = useMemo(() => {
    return filteredNotifications.filter((n) => !n.readAt).length;
  }, [filteredNotifications]);

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedNotifications);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedNotifications(newSelection);
  };


  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead.mutateAsync(notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      // TODO: Add delete API call when delete mutation is available
      console.log('Delete notification:', notificationId);
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleBulkDelete = async () => {
    try {
      for (const id of selectedNotifications) {
        await handleDelete(id);
      }
      setSelectedNotifications(new Set());
    } catch (error) {
      console.error('Error deleting notifications:', error);
    }
  };

  const getTypeLabel = (type: NotificationType) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getChannelIcon = (channel: NotificationChannel) => {
    switch (channel) {
      case NotificationChannel.EMAIL:
        return <Mail className="w-4 h-4" />;
      case NotificationChannel.PUSH:
        return <Smartphone className="w-4 h-4" />;
      case NotificationChannel.SMS:
        return <MessageSquare className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: NotificationDeliveryStatus) => {
    switch (status) {
      case NotificationDeliveryStatus.DELIVERED:
      case NotificationDeliveryStatus.READ:
        return 'bg-success/20 text-success';
      case NotificationDeliveryStatus.SENT:
        return 'bg-primary/20 text-primary';
      case NotificationDeliveryStatus.PENDING:
        return 'bg-warning/20 text-warning';
      case NotificationDeliveryStatus.FAILED:
        return 'bg-destructive/20 text-destructive';
      default:
        return 'bg-background-secondary text-text-secondary';
    }
  };

  if (loading && items.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loading size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Notifications</h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Manage and monitor all notifications ({unreadCount} unread)
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="flex-1 w-full">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-text-muted" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
        <div className="flex overflow-x-auto pb-2 sm:pb-0 gap-2 sm:gap-2">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as NotificationType | 'all')}
            className="px-3 sm:px-4 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary whitespace-nowrap"
          >
            <option value="all">All Types</option>
            {Object.values(NotificationType).map((type) => (
              <option key={type} value={type}>
                {getTypeLabel(type)}
              </option>
            ))}
          </select>
          <select
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value as NotificationChannel | 'all')}
            className="px-3 sm:px-4 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary whitespace-nowrap"
          >
            <option value="all">All Channels</option>
            {Object.values(NotificationChannel).map((channel) => (
              <option key={channel} value={channel}>
                {channel.replace(/_/g, ' ').toUpperCase()}
              </option>
            ))}
          </select>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as NotificationDeliveryStatus | 'all')}
            className="px-3 sm:px-4 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary whitespace-nowrap"
          >
            <option value="all">All Status</option>
            {Object.values(NotificationDeliveryStatus).map((status) => (
              <option key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-destructive/20 text-destructive rounded-lg text-sm sm:text-base">
          {error instanceof Error ? error.message : 'An error occurred'}
        </div>
      )}

      {/* Bulk Actions */}
      {selectedNotifications.size > 0 && (
        <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-card border border-border rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <span className="text-xs sm:text-sm text-foreground">
            {selectedNotifications.size} notification(s) selected
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                selectedNotifications.forEach((id) => handleMarkAsRead(id));
                setSelectedNotifications(new Set());
              }}
              className="text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2"
            >
              <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
              Mark as Read
            </Button>
            <Button 
              variant="outline" 
              onClick={handleBulkDelete}
              className="text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2"
            >
              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
              Delete
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setSelectedNotifications(new Set())}
              className="text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2"
            >
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Notifications List */}
      <div className="bg-card rounded-lg border border-border divide-y divide-border">
        {filteredNotifications.length === 0 ? (
          <div className="p-6 sm:p-12 text-center text-text-secondary">
            <Bell className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 opacity-50" />
            <p className="text-sm sm:text-base">No notifications found</p>
            {searchQuery && (
              <p className="text-xs sm:text-sm mt-2">Try adjusting your search or filters</p>
            )}
          </div>
        ) : (
          filteredNotifications.map((notification) => {
            const isRead = !!notification.readAt;
            const isSelected = selectedNotifications.has(notification.id!);
            const createdAt = getDate(notification.createdAt);

            return (
              <div
                key={notification.id}
                className={cn(
                  'p-3 sm:p-4 flex items-start gap-2 sm:gap-3 md:gap-4 hover:bg-background-secondary transition-colors',
                  !isRead && 'bg-primary/5'
                )}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelection(notification.id!)}
                  className="w-4 h-4 rounded border-border mt-1 shrink-0"
                />
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-background-secondary flex items-center justify-center shrink-0">
                  <Bell className={cn('w-4 h-4 sm:w-5 sm:h-6', isRead ? 'text-text-muted' : 'text-primary')} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                        <p className={cn('font-medium text-sm sm:text-base truncate', isRead ? 'text-foreground' : 'text-foreground font-bold')}>
                          {notification.title}
                        </p>
                        {!isRead && (
                          <span className="px-1.5 sm:px-2 py-0.5 bg-primary text-primary-foreground rounded-full text-xs font-medium shrink-0">
                            New
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-text-secondary mb-2 line-clamp-2">{notification.body}</p>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 md:gap-4 text-xs text-text-muted mb-2">
                        <span className="truncate">To: {notification.recipient.email}</span>
                        <span className="hidden sm:inline">Type: {getTypeLabel(notification.type)}</span>
                        <div className="flex items-center gap-1">
                          {notification.channels.map((channel) => (
                            <span key={channel} className="flex items-center gap-1">
                              {getChannelIcon(channel)}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-2">
                        {Object.entries(notification.deliveryStatus)
                          .filter(([channel, status]) => {
                            // Comment out SMS and email pending statuses
                            const channelLower = channel.toLowerCase();
                            const isSmsOrEmail = channelLower === 'sms' || channelLower === 'email';
                            const isPending = status === NotificationDeliveryStatus.PENDING;
                            return !(isSmsOrEmail && isPending);
                          })
                          .map(([channel, status]) => (
                            <span
                              key={channel}
                              className={cn('px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs font-medium', getStatusColor(status))}
                            >
                              {channel}: {status}
                            </span>
                          ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                      <p className="text-xs sm:text-sm text-text-secondary whitespace-nowrap hidden sm:block">
                        {formatDate(createdAt.toISOString())}
                      </p>
                      <button
                        onClick={() => setViewingNotification(notification)}
                        className="p-1.5 sm:p-1 text-text-secondary hover:text-foreground transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {!isRead && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id!)}
                          className="p-1.5 sm:p-1 text-text-secondary hover:text-success transition-colors"
                          title="Mark as Read"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(notification.id!)}
                        className="p-1.5 sm:p-1 text-text-secondary hover:text-destructive transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-text-secondary mt-2 sm:hidden">
                    {formatDate(createdAt.toISOString())}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* View Notification Modal */}
      <Modal
        isOpen={!!viewingNotification}
        onClose={() => setViewingNotification(null)}
        title="Notification Details"
        size="md"
      >
        {viewingNotification && (
          <div className="space-y-3 sm:space-y-4">
            <div>
              <label className="text-xs sm:text-sm font-medium text-text-secondary">Title</label>
              <p className="text-sm sm:text-base text-foreground font-bold mt-1">{viewingNotification.title}</p>
            </div>
            <div>
              <label className="text-xs sm:text-sm font-medium text-text-secondary">Message</label>
              <p className="text-sm sm:text-base text-foreground mt-1">{viewingNotification.body}</p>
            </div>
            <div>
              <label className="text-xs sm:text-sm font-medium text-text-secondary">Type</label>
              <p className="text-sm sm:text-base text-foreground mt-1">{getTypeLabel(viewingNotification.type)}</p>
            </div>
            <div>
              <label className="text-xs sm:text-sm font-medium text-text-secondary">Recipient</label>
              <p className="text-sm sm:text-base text-foreground mt-1 break-all">{viewingNotification.recipient.email}</p>
            </div>
            <div>
              <label className="text-xs sm:text-sm font-medium text-text-secondary">Channels</label>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {viewingNotification.channels.map((channel) => (
                  <span key={channel} className="flex items-center gap-1 px-2 py-1 bg-background-secondary rounded text-xs sm:text-sm">
                    {getChannelIcon(channel)}
                    <span>{channel}</span>
                  </span>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs sm:text-sm font-medium text-text-secondary">Delivery Status</label>
              <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-1">
                {Object.entries(viewingNotification.deliveryStatus)
                  .filter(([channel, status]) => {
                    // Comment out SMS and email pending statuses
                    const channelLower = channel.toLowerCase();
                    const isSmsOrEmail = channelLower === 'sms' || channelLower === 'email';
                    const isPending = status === NotificationDeliveryStatus.PENDING;
                    return !(isSmsOrEmail && isPending);
                  })
                  .map(([channel, status]) => (
                    <span
                      key={channel}
                      className={cn('px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs font-medium', getStatusColor(status))}
                    >
                      {channel}: {status}
                    </span>
                  ))}
              </div>
            </div>
            <div>
              <label className="text-xs sm:text-sm font-medium text-text-secondary">Created At</label>
              <p className="text-sm sm:text-base text-foreground mt-1">
                {formatDate(getDate(viewingNotification.createdAt).toISOString())}
              </p>
            </div>
            {viewingNotification.readAt && (
              <div>
                <label className="text-xs sm:text-sm font-medium text-text-secondary">Read At</label>
                <p className="text-sm sm:text-base text-foreground mt-1">
                  {formatDate(getDate(viewingNotification.readAt).toISOString())}
                </p>
              </div>
            )}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-border">
              {!viewingNotification.readAt && (
                <Button
                  variant="outline"
                  onClick={() => {
                    handleMarkAsRead(viewingNotification.id!);
                    setViewingNotification(null);
                  }}
                  className="w-full sm:w-auto"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Mark as Read
                </Button>
              )}
              <Button onClick={() => setViewingNotification(null)} className="w-full sm:w-auto">Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
