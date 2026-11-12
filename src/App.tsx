import { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { ToastContainer } from './components/ui';
import { DashboardPage } from './modules/dashboard/DashboardPage';
import { TasksPage } from './modules/tasks/TasksPage';
import { HabitsPage } from './modules/habits/HabitsPage';
import { FitnessPage } from './modules/fitness/FitnessPage';
import { FinancePage } from './modules/finance/FinancePage';
import { JournalPage } from './modules/journal/JournalPage';
import { GoalsPage } from './modules/goals/GoalsPage';
import { CalendarPage } from './modules/calendar/CalendarPage';
import { SettingsPage } from './modules/settings/SettingsPage';
import { PrivacyPage } from './modules/settings/PrivacyPage';
import { InstallGuidePage } from './modules/settings/InstallGuidePage';
import { seedDatabase } from './db/seeds';
import { db } from './db/database';

export function App() {
  useEffect(() => {
    // Seed demo data on first load
    seedDatabase().catch(console.error);

    // Check for due recurring transactions
    checkRecurringTransactions();
  }, []);

  return (
    <HashRouter>
      <ToastContainer />
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="habits" element={<HabitsPage />} />
          <Route path="fitness" element={<FitnessPage />} />
          <Route path="finance" element={<FinancePage />} />
          <Route path="journal" element={<JournalPage />} />
          <Route path="goals" element={<GoalsPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="settings/privacy" element={<PrivacyPage />} />
          <Route path="settings/install" element={<InstallGuidePage />} />
          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

/** Auto-create recurring transactions that are overdue */
async function checkRecurringTransactions() {
  try {
    const recurring = await db.transactions.filter(t => t.isRecurring && !!t.recurringFrequency).toArray();
    const today = new Date().toISOString().slice(0, 10);

    for (const txn of recurring) {
      if (!txn.date || !txn.recurringFrequency) continue;
      let next = new Date(txn.date);

      // Calculate next due date
      while (next.toISOString().slice(0, 10) < today) {
        if (txn.recurringFrequency === 'daily') next.setDate(next.getDate() + 1);
        else if (txn.recurringFrequency === 'weekly') next.setDate(next.getDate() + 7);
        else if (txn.recurringFrequency === 'monthly') next.setMonth(next.getMonth() + 1);
        else if (txn.recurringFrequency === 'yearly') next.setFullYear(next.getFullYear() + 1);
        else break;

        const nextStr = next.toISOString().slice(0, 10);
        if (nextStr > today) break;

        // Check if already created
        const exists = await db.transactions.where('recurringParentId').equals(txn.id!).and(t => t.date === nextStr).count();
        if (!exists) {
          const now = new Date().toISOString();
          await db.transactions.add({
            ...txn,
            id: undefined,
            date: nextStr,
            recurringParentId: txn.id,
            isRecurring: false, // child instances are not recurring themselves
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    }
  } catch (err) {
    console.warn('[recurring]', err);
  }
}
