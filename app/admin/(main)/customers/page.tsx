/**
 * Admin Customers Management
 */

'use client';

import React, { useState } from 'react';
import { useCustomers, useRealtimeCustomers, useUpdateCustomer, useDeleteCustomer } from '@/hooks';
import { User } from '@/types/user';
import { Button, Modal, Input, Loading, useToast, useConfirmDialog, ConfirmDialog, OptimizedImage } from '@/components/ui';
import { getUserFriendlyMessage, ERROR_MESSAGES } from '@/lib/utils/user-messages';
import { Search, Edit, Trash2, Eye, Mail, Phone, User as UserIcon, Download } from 'lucide-react';
import { exportCustomersPdf } from '@/lib/exports/exports';
import { cn } from '@/lib/utils/cn';
import { formatDate } from '@/lib/utils/formatting';
import { Timestamp } from 'firebase/firestore';
import Link from 'next/link';
import { useApp } from '@/contexts/AppContext';

export default function AdminCustomersPage() {
  const toast = useToast();
  const { confirmDialog, showConfirm, hideConfirm } = useConfirmDialog();
  const { currentBusiness } = useApp();
  const { data: items = [], isLoading: loading, error } = useCustomers();
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingCustomer, setViewingCustomer] = useState<User | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Handle export
  const handleExport = async () => {
    const fileName = `customers-${new Date().toISOString().split('T')[0]}`;

    try {
      await exportCustomersPdf({
        customers: filteredCustomers,
        fileName,
        business: currentBusiness || undefined,
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast.showError('Failed to export customers. Please try again.');
    }
  };

  // Real-time updates
  useRealtimeCustomers();

  // Filter customers by search query
  const filteredCustomers = items.filter((customer) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      customer.displayName?.toLowerCase().includes(query) ||
      customer.email.toLowerCase().includes(query) ||
      customer.phone?.toLowerCase().includes(query)
    );
  });

  // Calculate customer stats
  const getCustomerStats = (customer: User) => {
    // This would typically come from orders/bookings aggregation
    // For now, return placeholder values
    return {
      totalOrders: 0,
      totalSpent: 0,
      lastOrderDate: null as Date | string | null,
    };
  };

  const handleViewCustomer = (customer: User) => {
    setViewingCustomer(customer);
  };

  const handleEditCustomer = (customer: User) => {
    setEditingCustomer(customer);
    setIsEditing(true);
  };

  const handleDeleteCustomer = async (customerId: string) => {
    showConfirm({
      title: 'Delete Customer',
      message: 'Are you sure you want to delete this customer? This action cannot be undone.',
      type: 'danger',
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          await deleteCustomer.mutateAsync(customerId);
          toast.showSuccess('Customer deleted successfully');
        } catch (error) {
          console.error('Error deleting customer:', error);
          toast.showError(getUserFriendlyMessage(error, ERROR_MESSAGES.DELETE_FAILED));
        }
      },
    });
  };

  const handleSaveEdit = async () => {
    if (!editingCustomer || !editingCustomer.id) {
      toast.showError('Customer ID is missing. Please refresh the page and try again.');
      return;
    }

    try {
      await updateCustomer.mutateAsync({
        customerId: editingCustomer.id,
        updates: {
          displayName: editingCustomer.displayName,
          phone: editingCustomer.phone,
          isActive: editingCustomer.isActive,
        },
      });
      setIsEditing(false);
      setEditingCustomer(null);
      toast.showSuccess('Customer updated successfully');
    } catch (error) {
      console.error('Error updating customer:', error);
      toast.showError(getUserFriendlyMessage(error, ERROR_MESSAGES.UPDATE_FAILED));
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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Customers Management</h1>
          <p className="text-sm text-muted-foreground">
            {filteredCustomers.length} {filteredCustomers.length === 1 ? 'customer' : 'customers'} found
          </p>
        </div>
        <div className="flex gap-2 sm:justify-end">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={filteredCustomers.length === 0}
            className="whitespace-nowrap"
          >
            <Download className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Export</span>
            <span className="sm:hidden">DL</span>
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4 sm:mb-6">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-muted" />
          <Input
            type="text"
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-destructive/20 text-destructive rounded-lg">
          {error instanceof Error ? error.message : 'An error occurred'}
        </div>
      )}

      {/* Customers Table - Desktop */}
      <div className="hidden md:block bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-background-secondary">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Name</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Email</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Phone</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Joined</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredCustomers.map((customer) => {
  
                return (
                  <tr key={customer.id} className="hover:bg-background-secondary transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {customer.photoURL ? (
                          <OptimizedImage
                            src={customer.photoURL}
                            alt={customer.displayName || 'Customer'}
                            className="w-10 h-10 rounded-full"
                            width={250}
                            height={250}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <UserIcon className="w-5 h-5 text-primary" />
                          </div>
                        )}
                        <span className="text-sm font-medium text-foreground">
                          {customer.displayName || 'No Name'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Link
                        href={`mailto:${customer.email}`}
                        className="text-sm text-primary hover:text-primary-hover flex items-center gap-1"
                      >
                        <Mail className="w-4 h-4" />
                        {customer.email}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      {customer.phone ? (
                        <Link
                          href={`tel:${customer.phone}`}
                          className="text-sm text-primary hover:text-primary-hover flex items-center gap-1"
                        >
                          <Phone className="w-4 h-4" />
                          {customer.phone}
                        </Link>
                      ) : (
                        <span className="text-sm text-text-secondary">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={cn(
                          'px-2 py-1 rounded-full text-xs font-medium',
                          customer.isActive !== false
                            ? 'bg-success/20 text-success'
                            : 'bg-destructive/20 text-destructive'
                        )}
                      >
                        {customer.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-text-secondary">
                      {customer.createdAt 
                        ? formatDate(
                            customer.createdAt instanceof Timestamp
                              ? customer.createdAt.toDate().toISOString()
                              : customer.createdAt instanceof Date
                              ? customer.createdAt.toISOString()
                              : customer.createdAt as string
                          )
                        : '-'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewCustomer(customer)}
                          className="p-2 text-text-secondary hover:text-foreground transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditCustomer(customer)}
                          className="p-2 text-text-secondary hover:text-foreground transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => customer.id && handleDeleteCustomer(customer.id)}
                          className="p-2 text-destructive hover:text-destructive-hover transition-colors"
                          title="Delete"
                          disabled={!customer.id}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customers Cards - Mobile */}
      <div className="md:hidden space-y-3">
        {filteredCustomers.length > 0 ? (
          filteredCustomers.map((customer) => (
            <div key={customer.id} className="bg-card rounded-lg border border-border p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {customer.photoURL ? (
                    <OptimizedImage
                      src={customer.photoURL}
                      alt={customer.displayName || 'Customer'}
                      className="w-12 h-12 rounded-full"
                      width={250}
                      height={250}
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <UserIcon className="w-6 h-6 text-primary" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      {customer.displayName || 'No Name'}
                    </h3>
                    <span
                      className={cn(
                        'inline-block px-2 py-1 rounded-full text-xs font-medium mt-1',
                        customer.isActive !== false
                          ? 'bg-success/20 text-success'
                          : 'bg-destructive/20 text-destructive'
                      )}
                    >
                      {customer.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleViewCustomer(customer)}
                    className="p-2 text-text-secondary hover:text-foreground transition-colors"
                    title="View"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleEditCustomer(customer)}
                    className="p-2 text-text-secondary hover:text-foreground transition-colors"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => customer.id && handleDeleteCustomer(customer.id)}
                    className="p-2 text-destructive hover:text-destructive-hover transition-colors"
                    title="Delete"
                    disabled={!customer.id}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-text-muted flex-shrink-0" />
                  <Link
                    href={`mailto:${customer.email}`}
                    className="text-primary hover:text-primary-hover truncate"
                  >
                    {customer.email}
                  </Link>
                </div>
                
                {customer.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-text-muted flex-shrink-0" />
                    <Link
                      href={`tel:${customer.phone}`}
                      className="text-primary hover:text-primary-hover"
                    >
                      {customer.phone}
                    </Link>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <span className="text-text-muted">Joined:</span>
                  <span className="text-text-secondary">
                    {customer.createdAt 
                      ? formatDate(
                          customer.createdAt instanceof Timestamp
                            ? customer.createdAt.toDate().toISOString()
                            : customer.createdAt instanceof Date
                            ? customer.createdAt.toISOString()
                            : customer.createdAt as string
                        )
                      : '-'}
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <UserIcon className="w-12 h-12 mx-auto mb-4 text-text-muted opacity-50" />
            <p className="text-text-secondary">
              {searchQuery ? 'No customers found matching your search' : 'No customers found'}
            </p>
          </div>
        )}
      </div>
      <Modal
        isOpen={isEditing && !!editingCustomer}
        onClose={() => {
          setIsEditing(false);
          setEditingCustomer(null);
        }}
        title="Edit Customer"
        size="md"
      >
        {editingCustomer && (
          <div className="space-y-4">
            <Input
              label="Display Name"
              value={editingCustomer.displayName || ''}
              onChange={(e) =>
                setEditingCustomer({ ...editingCustomer, displayName: e.target.value })
              }
              placeholder="Customer name"
            />
            <Input
              label="Phone"
              value={editingCustomer.phone || ''}
              onChange={(e) =>
                setEditingCustomer({ ...editingCustomer, phone: e.target.value })
              }
              placeholder="Phone number"
            />
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editingCustomer.isActive !== false}
                  onChange={(e) =>
                    setEditingCustomer({
                      ...editingCustomer,
                      isActive: e.target.checked,
                    })
                  }
                  className="form-checkbox h-4 w-4 text-primary-600 transition duration-150 ease-in-out"
                />
                <span className="text-sm font-medium text-foreground">Active</span>
              </label>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  setEditingCustomer(null);
                }}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} className="w-full sm:w-auto">
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog {...confirmDialog} onClose={hideConfirm} />
    </div>
  );
}
