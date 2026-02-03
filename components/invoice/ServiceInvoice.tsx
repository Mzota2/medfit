'use client';

import React from 'react';
import Image from 'next/image';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils/formatting';
import { formatInvoiceDate, formatInvoiceDateTime, generateInvoiceNumber } from '@/lib/utils/invoiceUtils';
import { Booking } from '@/types/booking';
import { MALAWI_DISTRICTS } from '@/types/delivery';
import { business } from '@/types/business';

interface ServiceInvoiceProps {
  booking: Booking;
  business: business;
  invoiceNumber?: string;
}

export const ServiceInvoice: React.FC<ServiceInvoiceProps> = ({ 
  booking, 
  business, 
  invoiceNumber 
}) => {
  const invNumber = invoiceNumber || generateInvoiceNumber(business.name);
  const currentDate = new Date();

  const startTime = booking.timeSlot.startTime instanceof Date 
    ? booking.timeSlot.startTime 
    : new Date(booking.timeSlot.startTime);
  const endTime = booking.timeSlot.endTime instanceof Date 
    ? booking.timeSlot.endTime 
    : new Date(booking.timeSlot.endTime);

  const isPartialPayment = booking?.pricing.isPartialPayment || false;
  const remainingBalance = isPartialPayment && booking?.pricing.totalFee
    ? booking.pricing.totalFee - (booking.pricing.bookingFee || 0) + (booking.pricing.totalFee * 0.08)
    : 0;

  return (
    <div className="max-w-4xl mx-auto bg-white p-8" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Header */}
      <div className="border-b-2 border-gray-800 pb-6 mb-8">
        <div className="flex justify-between items-start">
          {/* Business Info */}
          <div className="flex-1">
            {business.logo && (
              <div className="mb-4">
                <Image
                  src={business.logo}
                  alt={business.name}
                  width={120}
                  height={120}
                  className="object-cover"
                />
              </div>
            )}
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{business.name}</h1>
            <div className="text-sm text-gray-600 space-y-1">
              <p>{business.address?.areaOrVillage}</p>
              {business.address?.traditionalAuthority && (
                <p>{business.address.traditionalAuthority}</p>
              )}
              {business.address?.district && (
                <p>
                  {Object.values(MALAWI_DISTRICTS).flat().find(d => d === business.address?.district) || business.address?.district}
                </p>
              )}
              <p>{business.address?.region}, {business.address?.country || 'Malawi'}</p>
              {business.contactInfo?.phone && <p>Tel: {business.contactInfo.phone}</p>}
              {business.contactInfo?.email && <p>Email: {business.contactInfo.email}</p>}
              {business.tpin && <p>TPIN: {business.tpin}</p>}
            </div>
          </div>

          {/* Invoice Info */}
          <div className="text-right">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">INVOICE</h2>
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Invoice Number:</strong> {invNumber}</p>
              <p><strong>Invoice Date:</strong> {formatInvoiceDate(currentDate)}</p>
              <p><strong>Booking Number:</strong> {booking.bookingNumber}</p>
              <p><strong>Booking Date:</strong> {formatDate(booking.createdAt instanceof Date ? booking.createdAt : booking.createdAt.toDate())}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Information */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Bill To:</h3>
        <div className="text-sm text-gray-700">
          <p className="font-medium">{booking.customerName}</p>
          {booking.customerEmail && <p>{booking.customerEmail}</p>}
          {booking.customerPhone && <p>{booking.customerPhone}</p>}
        </div>
      </div>

      {/* Service Details */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Service Details</h3>
        <div className="bg-gray-50 p-4 rounded">
          <div className="flex gap-4 mb-3">
            {booking.serviceImage && (
              <div className="relative w-20 h-20 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                <Image
                  src={booking.serviceImage}
                  alt={booking.serviceName}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <div className="flex-grow">
              <h4 className="font-semibold text-gray-900 mb-2">{booking.serviceName}</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Date:</strong> {formatDate(startTime)}</p>
                <p><strong>Time:</strong> {formatDateTime(startTime)} - {formatDateTime(endTime)}</p>
                <p><strong>Duration:</strong> {booking.timeSlot.duration} minutes</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Table */}
      <div className="mb-8">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-900">Description</th>
              <th className="border border-gray-300 px-4 py-3 text-right text-sm font-semibold text-gray-900">Amount</th>
            </tr>
          </thead>
          <tbody>
            {isPartialPayment ? (
              <>
                <tr>
                  <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Booking Fee</td>
                  <td className="border border-gray-300 px-4 py-3 text-right text-sm text-gray-700">
                    {formatCurrency(booking.pricing.bookingFee || 0, booking.pricing.currency)}
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Tax (8%)</td>
                  <td className="border border-gray-300 px-4 py-3 text-right text-sm text-gray-700">
                    {formatCurrency(booking.pricing.tax || 0, booking.pricing.currency)}
                  </td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-900">Amount Paid</td>
                  <td className="border border-gray-300 px-4 py-3 text-right text-sm font-semibold text-gray-900">
                    {formatCurrency(booking.pricing.total, booking.pricing.currency)}
                  </td>
                </tr>
                {remainingBalance > 0 && (
                  <tr>
                    <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Remaining Balance</td>
                    <td className="border border-gray-300 px-4 py-3 text-right text-sm text-gray-700">
                      {formatCurrency(remainingBalance, booking.pricing.currency)}
                    </td>
                  </tr>
                )}
                <tr className="bg-gray-50">
                  <td className="border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-900">Total Service Fee</td>
                  <td className="border border-gray-300 px-4 py-3 text-right text-sm font-semibold text-gray-900">
                    {formatCurrency(booking.pricing.totalFee || booking.pricing.basePrice, booking.pricing.currency)}
                  </td>
                </tr>
              </>
            ) : (
              <>
                <tr>
                  <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Service Fee</td>
                  <td className="border border-gray-300 px-4 py-3 text-right text-sm text-gray-700">
                    {formatCurrency(booking.pricing.basePrice, booking.pricing.currency)}
                  </td>
                </tr>
                {booking.pricing.tax && (
                  <tr>
                    <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Tax</td>
                    <td className="border border-gray-300 px-4 py-3 text-right text-sm text-gray-700">
                      {formatCurrency(booking.pricing.tax, booking.pricing.currency)}
                    </td>
                  </tr>
                )}
                <tr className="border-t-2 border-gray-800">
                  <td className="border border-gray-300 px-4 py-3 text-base font-semibold text-gray-900">Total Paid</td>
                  <td className="border border-gray-300 px-4 py-3 text-right text-xl font-bold text-gray-900">
                    {formatCurrency(booking.pricing.total, booking.pricing.currency)}
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Payment Information */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Payment Information</h3>
        <div className="text-sm text-gray-700 bg-gray-50 p-4 rounded">
          <p><strong>Payment Method:</strong> {booking.payment?.paymentMethod || 'Online Payment'}</p>
          <p><strong>Payment Status:</strong> <span className="text-green-600 font-semibold">Paid</span></p>
          <p><strong>Payment Date:</strong> {formatDate(booking.createdAt instanceof Date ? booking.createdAt : booking.createdAt.toDate())}</p>
          {isPartialPayment && remainingBalance > 0 && (
            <p className="mt-2 text-amber-600">
              <strong>Note:</strong> Remaining balance of {formatCurrency(remainingBalance, booking.pricing.currency)} 
              can be paid when the service is completed.
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t-2 border-gray-800 pt-6 mt-8">
        <div className="text-center text-sm text-gray-600">
          <p>Thank you for choosing our service!</p>
          <p>This is a computer-generated invoice and does not require a signature.</p>
          <p className="mt-2">
            <strong>Generated on:</strong> {formatInvoiceDateTime(currentDate)}
          </p>
        </div>
      </div>
    </div>
  );
};
