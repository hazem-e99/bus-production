'use client';

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog = ({
  open,
  title = 'Are you sure?',
  description = 'This action cannot be undone.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onCancel}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-xl bg-white border border-border p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-warning/10 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-warning" />
                  </div>
                  <div className="flex-1">
                    <Dialog.Title as="h3" className="text-lg font-semibold text-text-primary">
                      {title}
                    </Dialog.Title>
                    <div className="mt-2">
                      <p className="text-sm text-text-secondary">{description}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <Button variant="outline" onClick={onCancel}>{cancelText}</Button>
                  <Button onClick={onConfirm}>{confirmText}</Button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};


