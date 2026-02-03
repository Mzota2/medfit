'use client';

import React from 'react';
import Image from 'next/image';
import { formatCurrency, formatDate } from '@/lib/utils/formatting';
import { formatInvoiceDate, formatInvoiceDateTime, generateInvoiceNumber } from '@/lib/utils/invoiceUtils';
import { Order, FulfillmentMethod } from '@/types/order';
import { MALAWI_DISTRICTS } from '@/types/delivery';
import { business } from '@/types/business';

interface ProductInvoiceProps {
  order: Order;
  business: business;
  invoiceNumber?: string;
}

export const ProductInvoice: React.FC<ProductInvoiceProps> = ({ 
  order, 
  business, 
  invoiceNumber 
}) => {
  const invNumber = invoiceNumber || generateInvoiceNumber(business.name);
  const currentDate = new Date();

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
              <p><strong>Order Number:</strong> {order.orderNumber}</p>
              <p><strong>Order Date:</strong> {formatDate(order.createdAt instanceof Date ? order.createdAt : order.createdAt.toDate())}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Information */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Bill To:</h3>
        <div className="text-sm text-gray-700">
          <p className="font-medium">{order.customerName}</p>
          {order.customerEmail && <p>{order.customerEmail}</p>}
          
          {order.delivery?.address && (
            <div className="mt-2">
              <p>{order.delivery.address.areaOrVillage}</p>
              {order.delivery.address.traditionalAuthority && (
                <p>{order.delivery.address.traditionalAuthority}</p>
              )}
              {order.delivery.address.district && (
                <p>
                  {Object.values(MALAWI_DISTRICTS).flat().find(d => d === order.delivery?.address?.district) || order.delivery.address.district}
                </p>
              )}
              <p>{order.delivery.address.region}, {order.delivery.address.country}</p>
            </div>
          )}
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-8">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-900">Description</th>
              <th className="border border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-900">Quantity</th>
              <th className="border border-gray-300 px-4 py-3 text-right text-sm font-semibold text-gray-900">Unit Price</th>
              <th className="border border-gray-300 px-4 py-3 text-right text-sm font-semibold text-gray-900">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, index) => (
              <tr key={index}>
                <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">
                  <div>
                    <p className="font-medium">{item.productName}</p>
                    {item.sku && <p className="text-xs text-gray-500">SKU: {item.sku}</p>}
                  </div>
                </td>
                <td className="border border-gray-300 px-4 py-3 text-center text-sm text-gray-700">
                  {item.quantity}
                </td>
                <td className="border border-gray-300 px-4 py-3 text-right text-sm text-gray-700">
                  {formatCurrency(item.unitPrice || (item.subtotal / item.quantity), order.pricing.currency)}
                </td>
                <td className="border border-gray-300 px-4 py-3 text-right text-sm text-gray-700">
                  {formatCurrency(item.subtotal, order.pricing.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pricing Summary */}
      <div className="flex justify-end mb-8">
        <div className="w-full max-w-xs">
          <table className="w-full">
            <tbody>
              <tr>
                <td className="py-2 text-sm text-gray-600">Subtotal:</td>
                <td className="py-2 text-right text-sm text-gray-900">
                  {formatCurrency(order.pricing.subtotal, order.pricing.currency)}
                </td>
              </tr>
              {typeof order.pricing.discount === 'number' && order.pricing.discount > 0 && (
                <tr>
                  <td className="py-2 text-sm text-gray-600">Discount:</td>
                  <td className="py-2 text-right text-sm text-green-600">
                    -{formatCurrency(order.pricing.discount, order.pricing.currency)}
                  </td>
                </tr>
              )}
              {order.delivery?.method === FulfillmentMethod.DELIVERY && 
               typeof order.pricing.shipping === 'number' && 
               order.pricing.shipping > 0 && (
                <tr>
                  <td className="py-2 text-sm text-gray-600">Shipping:</td>
                  <td className="py-2 text-right text-sm text-gray-900">
                    {formatCurrency(order.pricing.shipping, order.pricing.currency)}
                  </td>
                </tr>
              )}
              {order.pricing.tax && order.pricing.tax > 0 && (
                <tr>
                  <td className="py-2 text-sm text-gray-600">Tax:</td>
                  <td className="py-2 text-right text-sm text-gray-900">
                    {formatCurrency(order.pricing.tax, order.pricing.currency)}
                  </td>
                </tr>
              )}
              <tr className="border-t-2 border-gray-800">
                <td className="py-3 text-base font-semibold text-gray-900">Total:</td>
                <td className="py-3 text-right text-xl font-bold text-gray-900">
                  {formatCurrency(order.pricing.total, order.pricing.currency)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Delivery Information */}
      {order.delivery && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            {order.delivery.method === FulfillmentMethod.DELIVERY ? 'Delivery' : 'Pickup'} Information
          </h3>
          <div className="text-sm text-gray-700 bg-gray-50 p-4 rounded">
            {order.delivery.method === FulfillmentMethod.DELIVERY ? (
              <div>
                <p><strong>Delivery Address:</strong></p>
                <p>{order.delivery.address?.areaOrVillage}</p>
                {order.delivery.address?.traditionalAuthority && (
                  <p>{order.delivery.address.traditionalAuthority}</p>
                )}
                {order.delivery.address?.district && (
                  <p>
                    {Object.values(MALAWI_DISTRICTS).flat().find(d => d === order.delivery?.address?.district) || order.delivery.address.district}
                  </p>
                )}
                <p>{order.delivery.address?.region}, {order.delivery.address?.country}</p>
                {order.delivery.estimatedDeliveryDate && (
                  <p className="mt-2"><strong>Estimated Delivery:</strong> {formatDate(new Date(order.delivery.estimatedDeliveryDate))}</p>
                )}
              </div>
            ) : (
              <div>
                <p><strong>Pickup Location:</strong></p>
                <p>{business.address?.areaOrVillage}</p>
                {business.address?.traditionalAuthority && (
                  <p>{business.address.traditionalAuthority}</p>
                )}
                {business.address?.district && (
                  <p>
                    {Object.values(MALAWI_DISTRICTS).flat().find(d => d === business.address?.district) || business.address.district}
                  </p>
                )}
                <p>{business.address?.region}, {business.address?.country || 'Malawi'}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t-2 border-gray-800 pt-6 mt-8">
        <div className="text-center text-sm text-gray-600">
          <p>Thank you for your business!</p>
          <p>This is a computer-generated invoice and does not require a signature.</p>
          <p className="mt-2">
            <strong>Generated on:</strong> {formatInvoiceDateTime(currentDate)}
          </p>
        </div>
      </div>
    </div>
  );
};
