import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

interface ToastStore {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).slice(2, 9);
    set(state => ({ toasts: [...state.toasts, { ...toast, id }] }));
    setTimeout(() => set(state => ({ toasts: state.toasts.filter(t => t.id !== id) })), toast.duration);
  },
  removeToast: (id) => set(state => ({ toasts: state.toasts.filter(t => t.id !== id) })),
}));

/** Imperative toast API — use anywhere without hooks */
export const toast = {
  success: (message: string, duration = 3000) =>
    useToastStore.getState().addToast({ type: 'success', message, duration }),
  error: (message: string, duration = 5000) =>
    useToastStore.getState().addToast({ type: 'error', message, duration }),
  warning: (message: string, duration = 4000) =>
    useToastStore.getState().addToast({ type: 'warning', message, duration }),
  info: (message: string, duration = 3000) =>
    useToastStore.getState().addToast({ type: 'info', message, duration }),
};
