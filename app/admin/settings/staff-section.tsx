/**
 * Staff Role Management Section Component
 * Handles adding staff, sending invitation emails, and updating roles
 */

'use client';

import React, { useState, useMemo } from 'react';
import { useAdminsStaff, useRealtimeAdminsStaff, useUpdateAdminStaffUser } from '@/hooks';
import { UserRole } from '@/types/user';
import { Button, Input, Modal, Loading } from '@/components/ui';
import { Plus,  Mail, User as UserIcon, Shield, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { formatDate } from '@/lib/utils/formatting';
import { getUserFriendlyMessage } from '@/lib/utils/user-messages';

interface StaffSectionProps {
  businessId?: string;
}

export function StaffSection({ businessId }: StaffSectionProps) {
  const { data: users = [], isLoading } = useAdminsStaff();
  const updateUser = useUpdateAdminStaffUser();
  const [showAddModal, setShowAddModal] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: UserRole.STAFF,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Real-time updates
  useRealtimeAdminsStaff();

  const staff = useMemo(() => users.filter((u) => u.role === 'admin' || u.role === 'staff'), [users]);

  const handleInviteStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!formData.email || !formData.firstName || !formData.lastName) {
      setErrors({ submit: 'Email, first name, and last name are required' });
      return;
    }

    try {
      setSendingInvite(true);
      const response = await fetch('/api/staff/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          role: formData.role,
          businessId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send invitation');
      }

      // React Query will automatically refetch after mutation
      setShowAddModal(false);
      setFormData({ email: '', firstName: '', lastName: '', role: UserRole.STAFF });
    } catch (error) {
      console.error('Error inviting staff:', error);
      const errorMessage = getUserFriendlyMessage(error instanceof Error ? error.message : 'Failed to send invitation');
      setErrors({ submit: errorMessage });
    } finally {
      setSendingInvite(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: UserRole) => {
    try {
      await updateUser.mutateAsync({ userId, updates: { role: newRole } });
      // React Query will automatically refetch after mutation
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return <Shield className="w-4 h-4" />;
      case UserRole.STAFF:
        return <UserCheck className="w-4 h-4" />;
      default:
        return <UserIcon className="w-4 h-4" />;
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return 'bg-primary/20 text-primary';
      case UserRole.STAFF:
        return 'bg-success/20 text-success';
      default:
        return 'bg-background-secondary text-text-secondary';
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-foreground">Staff Management</h2>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Add staff members and manage their roles. They will receive an email invitation with a password reset link.
          </p>
        </div>
        <Button onClick={() => { setFormData({ email: '', firstName: '', lastName: '', role: UserRole.STAFF }); setShowAddModal(true); }} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Add Staff
        </Button>
      </div>

      {isLoading && staff.length === 0 ? (
        <Loading size="lg" />
      ) : (
        <div className="bg-card rounded-lg border border-border divide-y divide-border">
          {staff.length === 0 ? (
            <div className="p-6 sm:p-12 text-center text-text-secondary">
              <UserIcon className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 opacity-50" />
              <p className="text-sm sm:text-base">No staff members</p>
              <p className="text-xs sm:text-sm mt-2">Add a staff member to get started</p>
            </div>
          ) : (
            staff.map((user) => (
              <div key={user.id} className="p-3 sm:p-4 hover:bg-background-secondary transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                  <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-background-secondary flex items-center justify-center shrink-0">
                      {getRoleIcon(user.role)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-bold text-foreground text-sm sm:text-base truncate">
                          {user.firstName && user.lastName 
                            ? `${user.firstName} ${user.lastName}` 
                            : user.firstName || user.lastName || user.displayName || user.email}
                        </h3>
                        <span className={cn('px-2 py-0.5 sm:py-1 rounded text-xs font-medium flex items-center gap-1 shrink-0', getRoleColor(user.role))}>
                          {getRoleIcon(user.role)}
                          {user.role.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-text-secondary truncate">{user.email}</p>
                      {user.createdAt && (
                        <p className="text-xs text-text-muted mt-1">
                          Joined: {formatDate((user.createdAt instanceof Date ? user.createdAt : (user.createdAt as unknown as { toDate?: () => Date })?.toDate?.() || new Date(user.createdAt as unknown as string)).toISOString())}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:shrink-0">
                    <select
                      value={user.role}
                      onChange={(e) => user.id && handleUpdateRole(user.id, e.target.value as UserRole)}
                      className="px-2 sm:px-3 py-1.5 sm:py-1 border border-border rounded-lg bg-background text-foreground text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-auto"
                    >
                      <option value={UserRole.STAFF}>Staff</option>
                      <option value={UserRole.ADMIN}>Admin</option>
                    </select>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add Staff Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); setFormData({ email: '', firstName: '', lastName: '', role: UserRole.STAFF }); setErrors({}); }}
        title="Invite Staff Member"
        size="md"
      >
        <form onSubmit={handleInviteStaff} className="space-y-3 sm:space-y-4">
          {errors.submit && (
            <div className="p-3 sm:p-4 bg-destructive/20 text-destructive rounded-lg text-xs sm:text-sm">
              {errors.submit}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Input
              label="First Name"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              required
              placeholder="John"
            />
            <Input
              label="Last Name"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              required
              placeholder="Doe"
            />
          </div>

          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            placeholder="staff@example.com"
          />

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
              className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value={UserRole.STAFF}>Staff</option>
              <option value={UserRole.ADMIN}>Admin</option>
            </select>
            <p className="text-xs text-text-secondary mt-1">
              Staff members can manage orders, bookings, and products. Admins have full access.
            </p>
          </div>

          <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 sm:p-4">
            <div className="flex items-start gap-2 sm:gap-3">
              <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-primary mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-xs sm:text-sm font-medium text-foreground mb-1">Email Invitation</p>
                <p className="text-xs text-text-secondary">
                  An invitation email will be sent to {formData.email || 'the email address'} with a password reset link. 
                  They can use this link to set their password and log in to the application.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => { setShowAddModal(false); setFormData({ email: '', firstName: '', lastName: '', role: UserRole.STAFF }); setErrors({}); }}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={sendingInvite} className="w-full sm:w-auto">
              {sendingInvite ? 'Sending...' : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Invitation
                </>
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

