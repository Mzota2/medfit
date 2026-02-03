/**
 * Order timeline component showing order status progression
 */

'use client';

import React from 'react';
import { CheckCircle, Clock, Package, Truck, XCircle, CreditCard } from 'lucide-react';
import { OrderStatus } from '@/types/order';
import { formatDate, formatDateTime } from '@/lib/utils/formatting';

interface OrderTimelineProps {
  status: OrderStatus;
  createdAt?: Date | string;
  paidAt?: Date | string;
  canceledAt?: Date | string;
  refundedAt?: Date | string;
  shippedAt?: Date | string;
  completedAt?: Date | string;
}

interface TimelineStep {
  status: OrderStatus;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const timelineSteps: TimelineStep[] = [
  {
    status: OrderStatus.PENDING,
    label: 'Order Placed',
    icon: <Package className="w-5 h-5" />,
    description: 'Your order has been placed',
  },
  {
    status: OrderStatus.PAID,
    label: 'Payment Confirmed',
    icon: <CreditCard className="w-5 h-5" />,
    description: 'Payment has been received',
  },
  {
    status: OrderStatus.PROCESSING,
    label: 'Processing',
    icon: <Clock className="w-5 h-5" />,
    description: 'Your order is being prepared',
  },
  {
    status: OrderStatus.SHIPPED,
    label: 'Shipped',
    icon: <Truck className="w-5 h-5" />,
    description: 'Your order is on the way',
  },
  {
    status: OrderStatus.COMPLETED,
    label: 'Delivered',
    icon: <CheckCircle className="w-5 h-5" />,
    description: 'Your order has been delivered',
  },
];

const statusOrder: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.PAID,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
  OrderStatus.COMPLETED,
];

export const OrderTimeline: React.FC<OrderTimelineProps> = ({
  status,
  createdAt,
  paidAt,
  canceledAt,
  refundedAt,
  shippedAt,
  completedAt,
}) => {
  const getStatusIndex = (currentStatus: OrderStatus): number => {
    return statusOrder.indexOf(currentStatus);
  };

  const getStatusDate = (stepStatus: OrderStatus): Date | string | undefined => {
    switch (stepStatus) {
      case OrderStatus.PENDING:
        return createdAt;
      case OrderStatus.PAID:
        return paidAt;
      case OrderStatus.PROCESSING:
        return paidAt; // Processing usually starts after payment
      case OrderStatus.SHIPPED:
        return shippedAt;
      case OrderStatus.COMPLETED:
        return completedAt;
      default:
        return undefined;
    }
  };

  const currentIndex = getStatusIndex(status);
  const isCanceled = status === OrderStatus.CANCELED;
  const isRefunded = status === OrderStatus.REFUNDED;

  return (
    <div className="relative">
      {/* Canceled/Refunded Status */}
      {(isCanceled || isRefunded) && (
        <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-lg">
          <div className="flex items-center gap-3">
            <XCircle className="w-5 h-5 text-error" />
            <div>
              <p className="font-semibold text-error">
                {isCanceled ? 'Order Canceled' : 'Order Refunded'}
              </p>
              <p className="text-sm text-text-secondary">
                {isCanceled && canceledAt && formatDateTime(new Date(canceledAt))}
                {isRefunded && refundedAt && formatDateTime(new Date(refundedAt))}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Timeline Steps */}
      <div className="space-y-6">
        {timelineSteps.map((step, index) => {
          const stepIndex = getStatusIndex(step.status);
          const isCompleted = stepIndex <= currentIndex && !isCanceled && !isRefunded;
          const isCurrent = stepIndex === currentIndex && !isCanceled && !isRefunded;
          const stepDate = getStatusDate(step.status);

          return (
            <div key={step.status} className="relative flex gap-4">
              {/* Timeline Line */}
              {index < timelineSteps.length - 1 && (
                <div
                  className={`absolute left-5 top-10 w-0.5 h-full ${
                    isCompleted ? 'bg-primary' : 'bg-border'
                  }`}
                />
              )}

              {/* Icon */}
              <div
                className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                  isCompleted
                    ? 'bg-primary border-primary text-primary-foreground'
                    : isCurrent
                    ? 'bg-primary/10 border-primary text-primary'
                    : 'bg-background-secondary border-border text-text-secondary'
                }`}
              >
                {step.icon}
              </div>

              {/* Content */}
              <div className="flex-grow pb-6">
                <div className="flex items-center justify-between mb-1">
                  <h4
                    className={`font-semibold ${
                      isCompleted || isCurrent ? 'text-foreground' : 'text-text-secondary'
                    }`}
                  >
                    {step.label}
                  </h4>
                  {stepDate && (isCompleted || isCurrent) && (
                    <span className="text-xs text-text-secondary">
                      {formatDate(new Date(stepDate))}
                    </span>
                  )}
                </div>
                <p className="text-sm text-text-secondary">{step.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

