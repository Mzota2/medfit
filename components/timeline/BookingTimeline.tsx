/**
 * Booking timeline component showing booking status progression
 */

'use client';

import React from 'react';
import { CheckCircle, Calendar, XCircle, CreditCard, UserCheck } from 'lucide-react';
import { BookingStatus } from '@/types/booking';
import { formatDate, formatDateTime } from '@/lib/utils/formatting';
import { Timestamp } from 'firebase/firestore';

type DateLike = Date | string | Timestamp;

interface BookingTimelineProps {
  status: BookingStatus;
  createdAt?: DateLike;
  paidAt?: DateLike;
  confirmedAt?: DateLike;
  canceledAt?: DateLike;
  noShowAt?: DateLike;
  refundedAt?: DateLike;
  completedAt?: DateLike;
  timeSlot?: {
    startTime: DateLike;
    endTime: DateLike;
  };
}

interface TimelineStep {
  status: BookingStatus;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const timelineSteps: TimelineStep[] = [
  {
    status: BookingStatus.PENDING,
    label: 'Booking Requested',
    icon: <Calendar className="w-5 h-5" />,
    description: 'Your booking has been requested',
  },
  {
    status: BookingStatus.PAID,
    label: 'Payment Confirmed',
    icon: <CreditCard className="w-5 h-5" />,
    description: 'Payment has been received',
  },
  {
    status: BookingStatus.CONFIRMED,
    label: 'Booking Confirmed',
    icon: <UserCheck className="w-5 h-5" />,
    description: 'Your booking has been confirmed',
  },
  {
    status: BookingStatus.COMPLETED,
    label: 'Service Completed',
    icon: <CheckCircle className="w-5 h-5" />,
    description: 'Service has been completed',
  },
];

const statusOrder: BookingStatus[] = [
  BookingStatus.PENDING,
  BookingStatus.PAID,
  BookingStatus.CONFIRMED,
  BookingStatus.COMPLETED,
];

export const BookingTimeline: React.FC<BookingTimelineProps> = ({
  status,
  createdAt,
  paidAt,
  confirmedAt,
  canceledAt,
  noShowAt,
  refundedAt,
  completedAt,
  timeSlot,
}) => {
  const getStatusIndex = (currentStatus: BookingStatus): number => {
    return statusOrder.indexOf(currentStatus);
  };

  const getStatusDate = (stepStatus: BookingStatus): DateLike | undefined => {
    switch (stepStatus) {
      case BookingStatus.PENDING:
        return createdAt;
      case BookingStatus.PAID:
        return paidAt;
      case BookingStatus.CONFIRMED:
        return confirmedAt;
      case BookingStatus.COMPLETED:
        return completedAt;
      default:
        return undefined;
    }
  };

  const currentIndex = getStatusIndex(status);
  const isCanceled = status === BookingStatus.CANCELED;
  const isRefunded = status === BookingStatus.REFUNDED;
  const isNoShow = status === BookingStatus.NO_SHOW;

  return (
    <div className="relative">
      {/* Scheduled Time */}
      {timeSlot && (
        <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-lg">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-primary" />
            <div>
              <p className="font-semibold text-foreground">Scheduled Time</p>
              <p className="text-sm text-text-secondary">
                {formatDateTime(
                  timeSlot.startTime instanceof Date
                    ? timeSlot.startTime
                    : (timeSlot.startTime as Timestamp | string) instanceof Timestamp
                    ? (timeSlot.startTime as Timestamp).toDate()
                    : new Date(timeSlot.startTime as string)
                )}{' '}
                -{' '}
                {formatDateTime(
                  timeSlot.endTime instanceof Date
                    ? timeSlot.endTime
                    : (timeSlot.endTime as Timestamp | string) instanceof Timestamp
                    ? (timeSlot.endTime as Timestamp).toDate()
                    : new Date(timeSlot.endTime as string)
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Canceled/Refunded/No Show Status */}
      {(isCanceled || isRefunded || isNoShow) && (
        <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-lg">
          <div className="flex items-center gap-3">
            <XCircle className="w-5 h-5 text-error" />
            <div>
              <p className="font-semibold text-error">
                {isCanceled ? 'Booking Canceled' : isRefunded ? 'Booking Refunded' : 'No Show'}
              </p>
              <p className="text-sm text-text-secondary">
                {isCanceled && canceledAt &&
                  formatDateTime(
                    canceledAt instanceof Timestamp
                      ? canceledAt.toDate()
                      : canceledAt instanceof Date
                      ? canceledAt
                      : new Date(canceledAt as string)
                  )}
                {isRefunded && refundedAt &&
                  formatDateTime(
                    refundedAt instanceof Timestamp
                      ? refundedAt.toDate()
                      : refundedAt instanceof Date
                      ? refundedAt
                      : new Date(refundedAt as string)
                  )}
                {isNoShow && noShowAt &&
                  formatDateTime(
                    noShowAt instanceof Timestamp
                      ? noShowAt.toDate()
                      : noShowAt instanceof Date
                      ? noShowAt
                      : new Date(noShowAt as string)
                  )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Timeline Steps */}
      <div className="space-y-6">
        {timelineSteps.map((step, index) => {
          const stepIndex = getStatusIndex(step.status);
          const isCompleted = stepIndex <= currentIndex && !isCanceled && !isRefunded && !isNoShow;
          const isCurrent = stepIndex === currentIndex && !isCanceled && !isRefunded && !isNoShow;
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
              <div className="grow pb-6">
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
                      {formatDate(
                        stepDate instanceof Timestamp
                          ? stepDate.toDate().toISOString()
                          : stepDate instanceof Date
                          ? stepDate.toISOString()
                          : (stepDate as string)
                      )}
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

