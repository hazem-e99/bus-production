'use client';

import { useState, useEffect } from 'react';
import { X, AlertCircle, Info, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
  onClose: (id: string) => void;
}

const toastIcons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const toastStyles = {
  success: 'bg-green-50 border-green-200 text-green-800 shadow-lg',
  error: 'bg-red-50 border-red-200 text-red-800 shadow-lg',
  info: 'bg-blue-50 border-blue-200 text-blue-800 shadow-lg',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800 shadow-lg',
};

export const Toast = ({ id, type, title, message, duration = 5000, onClose }: ToastProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const Icon = toastIcons[type];

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose(id), 300); // Wait for fade out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, id, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(id), 300);
  };

  return (
    <div
      className={cn(
        'fixed top-4 right-4 z-50 max-w-sm w-full p-4 border rounded-xl shadow-xl transition-all duration-300 backdrop-blur-sm',
        toastStyles[type],
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      )}
    >
      <div className="flex items-start space-x-3">
        <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{title}</p>
          {message && <p className="text-sm mt-1 opacity-90">{message}</p>}
        </div>
        <button
          onClick={handleClose}
          className="flex-shrink-0 p-1.5 hover:bg-black/10 rounded-lg transition-all duration-200 hover:scale-110"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export const ToastContainer = ({ toasts, onClose }: { toasts: ToastProps[]; onClose: (id: string) => void }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-3">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={onClose} />
      ))}
    </div>
  );
};

// Toast Context and Provider
import { createContext, useContext } from 'react';

interface ToastContextType {
  showToast: (toast: Omit<ToastProps, 'id' | 'onClose'>) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const showToast = (toastData: Omit<ToastProps, 'id' | 'onClose'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: ToastProps = {
      ...toastData,
      id,
      onClose: (toastId: string) => {
        setToasts(prev => prev.filter(toast => toast.id !== toastId));
      },
    };
    
    setToasts(prev => [...prev, newToast]);
  };

  const closeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} onClose={closeToast} />
    </ToastContext.Provider>
  );
};
