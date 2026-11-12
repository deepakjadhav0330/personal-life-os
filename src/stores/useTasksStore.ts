import { create } from 'zustand';
import type { TaskCategory, TaskPriority } from '../db/schema';

export type TaskTab = 'today' | 'upcoming' | 'overdue' | 'all' | 'completed';

interface TasksStore {
  activeTab: TaskTab;
  searchQuery: string;
  filterPriority: TaskPriority | null;
  filterCategory: TaskCategory | null;
  editingTaskId: number | null;
  isFormOpen: boolean;

  setActiveTab: (tab: TaskTab) => void;
  setSearchQuery: (q: string) => void;
  setFilterPriority: (p: TaskPriority | null) => void;
  setFilterCategory: (c: TaskCategory | null) => void;
  openForm: (taskId?: number) => void;
  closeForm: () => void;
}

export const useTasksStore = create<TasksStore>((set) => ({
  activeTab: 'today',
  searchQuery: '',
  filterPriority: null,
  filterCategory: null,
  editingTaskId: null,
  isFormOpen: false,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setFilterPriority: (filterPriority) => set({ filterPriority }),
  setFilterCategory: (filterCategory) => set({ filterCategory }),
  openForm: (taskId) => set({ editingTaskId: taskId ?? null, isFormOpen: true }),
  closeForm: () => set({ editingTaskId: null, isFormOpen: false }),
}));
