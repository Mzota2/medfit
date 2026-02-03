/**
 * Toast notification component
 * Provides user-friendly notifications throughout the application
 */

'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, 'id'>) => void;
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const duration = toast.duration ?? 5000;
    const newToast: Toast = {
      ...toast,
      id,
      duration,
    };

    setToasts((prev) => [...prev, newToast]);

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, [removeToast]);

  const showSuccess = useCallback((message: string, title?: string) => {
    return showToast({ type: 'success', message, title });
  }, [showToast]);

  const showError = useCallback((message: string, title?: string) => {
    return showToast({ type: 'error', message, title, duration: 7000 }); // Errors stay longer
  }, [showToast]);

  const showWarning = useCallback((message: string, title?: string) => {
    return showToast({ type: 'warning', message, title });
  }, [showToast]);

  const showInfo = useCallback((message: string, title?: string) => {
    return showToast({ type: 'info', message, title });
  }, [showToast]);

  return (
    <ToastContext.Provider
      value={{
        toasts,
        showToast,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        removeToast,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

interface ToastContainerProps {
  toasts: Toast[];
  removeToast: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[105] flex flex-col gap-3 w-full max-w-md">
      {toasts.map((toast) => (
        <div 
          key={toast.id} 
          className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
        >
          <ToastItem toast={toast} onRemove={() => removeToast(toast.id)} />
        </div>
      ))}
    </div>
  );
};

interface ToastItemProps {
  toast: Toast;
  onRemove: () => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
  const [isVisible, setIsVisible] = useState(true);

  const handleRemove = () => {
    setIsVisible(false);
    setTimeout(onRemove, 200); // Wait for animation
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5" />;
      case 'error':
        return <AlertCircle className="w-5 h-5" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />;
      case 'info':
        return <Info className="w-5 h-5" />;
    }
  };

  const getStyles = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-success/10 border-success/20 text-success';
      case 'error':
        return 'bg-destructive/10 border-destructive/20 text-destructive';
      case 'warning':
        return 'bg-warning/10 border-warning/20 text-warning';
      case 'info':
        return 'bg-info/10 border-info/20 text-info';
    }
  };

  return (
    <div
      className={cn(
        'bg-card border rounded-lg shadow-lg p-4 pointer-events-auto transition-all duration-200',
        getStyles(),
        isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          {toast.title && (
            <h4 className="font-semibold text-sm mb-1">{toast.title}</h4>
          )}
          <p className="text-sm">{toast.message}</p>
        </div>
        <button
          onClick={handleRemove}
          className="shrink-0 text-text-secondary hover:text-foreground transition-colors p-1 -mt-1 -mr-1"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

