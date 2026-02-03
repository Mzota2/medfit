/**
 * Reusable ConfirmDialog component to replace browser confirm()
 */

'use client';

import React, { useState, useCallback } from 'react';
import { Modal } from '@/components/ui';
import { Button } from '@/components/ui';
import { AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export type ConfirmDialogType = 'danger' | 'warning' | 'info';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: ConfirmDialogType;
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning',
  isLoading = false,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Confirmation error:', error);
      // Don't close on error - let parent handle it
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting && !isLoading) {
      onClose();
    }
  };

  const iconMap = {
    danger: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const iconColorMap = {
    danger: 'text-error',
    warning: 'text-warning',
    info: 'text-info',
  };

  const IconComponent = iconMap[type];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      size="md"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <IconComponent className={cn('w-6 h-6 flex-shrink-0 mt-0.5', iconColorMap[type])} />
          <p className="text-sm text-text-secondary">{message}</p>
        </div>

        <div className="flex gap-3 justify-end pt-4 border-t border-border">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting || isLoading}
          >
            {cancelText}
          </Button>
          <Button
            variant={type === 'danger' ? 'danger' : 'primary'}
            onClick={handleConfirm}
            disabled={isSubmitting || isLoading}
            isLoading={isSubmitting || isLoading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// Hook for using confirm dialog
interface UseConfirmDialogReturn {
  confirmDialog: {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    confirmText?: string;
    cancelText?: string;
    type?: ConfirmDialogType;
  };
  showConfirm: (options: {
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    confirmText?: string;
    cancelText?: string;
    type?: ConfirmDialogType;
  }) => void;
  hideConfirm: () => void;
}

export const useConfirmDialog = (): UseConfirmDialogReturn => {
  const [isOpen, setIsOpen] = useState(false);
  const [dialogOptions, setDialogOptions] = useState<Omit<UseConfirmDialogReturn['confirmDialog'], 'isOpen'>>({
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const showConfirm = useCallback((options: Parameters<UseConfirmDialogReturn['showConfirm']>[0]) => {
    setDialogOptions(options);
    setIsOpen(true);
  }, []);

  const hideConfirm = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    confirmDialog: {
      ...dialogOptions,
      isOpen,
    },
    showConfirm,
    hideConfirm,
  };
};

