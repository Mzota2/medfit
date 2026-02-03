/**
 * Reusable StatusBadge component for displaying order and booking status
 */

import React from 'react';
import { CheckCircle, XCircle, Clock, Package, Calendar, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui';
import { OrderStatus } from '@/types/order';
import { BookingStatus } from '@/types/booking';
import { cn } from '@/lib/utils/cn';

export type StatusType = OrderStatus | BookingStatus | string;

interface StatusBadgeProps {
  status: StatusType;
  showIcon?: boolean;
  showLabel?: boolean;
  className?: string;
  variant?: 'badge' | 'pill';
}

const getStatusIcon = (status: StatusType) => {
  const statusLower = status.toLowerCase();
  
  if (statusLower.includes('completed')) {
    return <CheckCircle className="w-5 h-5 text-success" />;
  }
  if (statusLower.includes('canceled') || statusLower.includes('refunded') || statusLower.includes('no_show')) {
    return <XCircle className="w-5 h-5 text-error" />;
  }
  if (statusLower.includes('pending')) {
    return <Clock className="w-5 h-5 text-warning" />;
  }
  if (statusLower.includes('booking') || statusLower === BookingStatus.CONFIRMED) {
    return <Calendar className="w-5 h-5 text-primary" />;
  }
  if (statusLower.includes('order') || statusLower.includes('paid') || statusLower.includes('processing') || statusLower.includes('shipped')) {
    return <Package className="w-5 h-5 text-primary" />;
  }
  return <AlertCircle className="w-5 h-5 text-text-secondary" />;
};

const getStatusColor = (status: StatusType): string => {
  const statusLower = status?.toLowerCase() || '';
  
  if (statusLower.includes('completed') || statusLower.includes('delivered')) {
    return 'text-success bg-success/10';
  }
  if (statusLower.includes('canceled') || 
       statusLower.includes('refunded') || 
       statusLower.includes('no_show') ||
       statusLower.includes('cancelled')) {
    return 'text-destructive bg-destructive/10';
  }
  if (statusLower.includes('pending') || 
       statusLower.includes('processing') ||
       statusLower.includes('shipped')) {
    return 'text-warning bg-warning/10';
  }
  if (statusLower.includes('paid') || statusLower.includes('confirmed')) {
    return 'text-info bg-info/10';
  }
  return 'text-text-secondary bg-background-secondary';
};

const getStatusBadgeVariant = (status: StatusType): 'default' | 'success' | 'warning' | 'danger' | 'info' => {
  const statusLower = status?.toLowerCase() || '';
  
  if (statusLower.includes('completed') || statusLower.includes('delivered')) {
    return 'success';
  }
  if (statusLower.includes('canceled') || 
       statusLower.includes('refunded') || 
       statusLower.includes('no_show') ||
       statusLower.includes('cancelled')) {
    return 'danger';
  }
  if (statusLower.includes('pending') || 
       statusLower.includes('processing') ||
       statusLower.includes('shipped')) {
    return 'warning';
  }
  if (statusLower.includes('paid') || 
       statusLower.includes('confirmed')) {
    return 'info';
  }
  return 'default';
};

const getStatusLabel = (status: StatusType): string => {
  // Handle snake_case (e.g., "no_show" -> "No Show")
  if (status.includes('_')) {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }
  // Handle camelCase (e.g., "orderNumber" -> "Order Number")
  return status.charAt(0).toUpperCase() + status.slice(1);
};

/**
 * StatusBadge component that displays status with icon and label
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  showIcon = true,
  showLabel = true,
  className,
  variant = 'pill',
}) => {
  const badgeVariant = getStatusBadgeVariant(status);
  
  if (variant === 'badge') {
    return (
      <Badge 
        variant={badgeVariant} 
        className={cn(
          'inline-flex items-center gap-1',
          className
        )}
      >
        {showIcon && <span className="flex-shrink-0">{getStatusIcon(status)}</span>}
        {showLabel && <span className="whitespace-nowrap">{getStatusLabel(status)}</span>}
      </Badge>
    );
  }

  // Pill variant (default)
  return (
    <div className={cn(
      'px-4 py-2 rounded-full flex items-center gap-2',
      getStatusColor(status),
      className
    )}>
      {showIcon && getStatusIcon(status)}
      {showLabel && <span className="font-medium">{getStatusLabel(status)}</span>}
    </div>
  );
};

/**
 * Utility functions exported for use in components that need more control
 */
export const statusUtils = {
  getStatusIcon,
  getStatusColor,
  getStatusLabel,
  getStatusBadgeVariant,
};

