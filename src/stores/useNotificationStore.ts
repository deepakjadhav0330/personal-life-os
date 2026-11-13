import { create } from 'zustand';

interface NotificationStore {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  isOpen: false,
  open:   () => set({ isOpen: true }),
  close:  () => set({ isOpen: false }),
  toggle: () => set(state => ({ isOpen: !state.isOpen })),
}));
