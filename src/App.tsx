import { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { addMonths } from 'date-fns';
import { AppLayout } from './components/layout/AppLayout';
import { AmbientBackground } from './components/layout/AmbientBackground';
import { ToastContainer } from './components/ui';
import { DashboardPage } from './modules/dashboard/DashboardPage';
import { TasksPage } from './modules/tasks/TasksPage';
import { HabitsPage } from './modules/habits/HabitsPage';
import { FitnessPage } from './modules/fitness/FitnessPage';
import { FinancePage } from './modules/finance/FinancePage';
import { JournalPage } from './modules/journal/JournalPage';
import { GoalsPage } from './modules/goals/GoalsPage';
import { CalendarPage } from './modules/calendar/CalendarPage';
import { LearningPage } from './modules/learning/LearningPage';
import { SettingsPage } from './modules/settings/SettingsPage';
import { PrivacyPage } from './modules/settings/PrivacyPage';
import { InstallGuidePage } from './modules/settings/InstallGuidePage';
import { seedDatabase } from './db/seeds';
import { db } from './db/database';

export function App() {
  useEffect(() => {
    seedDatabase().catch(console.error);
    checkRecurringTransactions();
  }, []);

  return (
    <HashRouter>
      {/* z-index:-1 keeps blobs behind all content without creating
          a stacking context that would trap modal/sheet z-indices    */}
      <AmbientBackground />
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
          <Route path="learning" element={<LearningPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="settings/privacy" element={<PrivacyPage />} />
          <Route path="settings/install" element={<InstallGuidePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

/** Auto-create recurring transactions — uses date-fns addMonths to avoid month overflow */
async function checkRecurringTransactions() {
  try {
    const recurring = await db.transactions
      .filter(t => t.isRecurring && !!t.recurringFrequency)
      .toArray();
    const today = new Date().toISOString().slice(0, 10);

    for (const txn of recurring) {
      if (!txn.date || !txn.recurringFrequency) continue;
      try {
        let next = new Date(txn.date);

        while (next.toISOString().slice(0, 10) < today) {
          if (txn.recurringFrequency === 'daily')   next.setDate(next.getDate() + 1);
          else if (txn.recurringFrequency === 'weekly') next.setDate(next.getDate() + 7);
          else if (txn.recurringFrequency === 'monthly') next = addMonths(next, 1); // safe month arithmetic
          else if (txn.recurringFrequency === 'yearly')  next.setFullYear(next.getFullYear() + 1);
          else break;

          const nextStr = next.toISOString().slice(0, 10);
          if (nextStr > today) break;

          const exists = await db.transactions
            .where('recurringParentId').equals(txn.id!)
            .and(t => t.date === nextStr)
            .count();

          if (!exists) {
            const now = new Date().toISOString();
            await db.transactions.add({
              ...txn,
              id: undefined,
              date: nextStr,
              recurringParentId: txn.id,
              isRecurring: false,
              createdAt: now,
              updatedAt: now,
            });
          }
        }
      } catch (innerErr) {
        console.warn('[recurring] failed for txn', txn.id, innerErr);
      }
    }
  } catch (err) {
    console.warn('[recurring]', err);
  }
}
