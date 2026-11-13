import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import { PageHeader } from '../../components/layout/PageHeader';
import { GlassCard, Button, Tabs, EmptyState, BottomSheet, Badge, Input, Select } from '../../components/ui';
import { toast } from '../../stores/useToastStore';
import { todayStr, formatDate } from '../../utils/dates';
import { useSetting } from '../../hooks/useSetting';
import { CalendarDays, Bell, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';

export function CalendarPage() {
  const [activeTab, setActiveTab] = useState<'month' | 'agenda' | 'reminders'>('month');
  return (
    <div className="min-h-screen-dvh">
      <PageHeader title="Calendar" />
      <div className="px-4 pb-4 flex flex-col gap-3">
        <Tabs
          tabs={[{ id: 'month', label: 'Month' }, { id: 'agenda', label: 'Agenda' }, { id: 'reminders', label: 'Reminders' }]}
          activeTab={activeTab}
          onChange={id => setActiveTab(id as any)}
        />
        {activeTab === 'month' && <MonthView />}
        {activeTab === 'agenda' && <AgendaView />}
        {activeTab === 'reminders' && <RemindersView />}
      </div>
    </div>
  );
}

function MonthView() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [weekStartsOn] = useSetting<0 | 1>('weekStartsOn', 1);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });
  const dayLabels = weekStartsOn === 1
    ? ['M', 'T', 'W', 'T', 'F', 'S', 'S']
    : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const tasks = useLiveQuery(() => db.tasks.where('status').equals('pending').toArray(), [], []);
  const reminders = useLiveQuery(() => db.reminders.where('status').equals('pending').toArray(), [], []);
  const goals = useLiveQuery(() => db.goals.where('status').equals('active').filter(g => !!g.targetDate).toArray(), [], []);

  function getEvents(date: Date) {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dots: { type: string; color: string }[] = [];
    if (tasks?.some(t => t.dueDate === dateStr)) dots.push({ type: 'task', color: '#6366f1' });
    if (reminders?.some(r => r.scheduledAt.startsWith(dateStr))) dots.push({ type: 'reminder', color: '#ef4444' });
    if (goals?.some(g => g.targetDate === dateStr)) dots.push({ type: 'goal', color: '#f59e0b' });
    return dots;
  }

  const selectedDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null;
  const selectedTasks = tasks?.filter(t => t.dueDate === selectedDateStr) ?? [];
  const selectedReminders = reminders?.filter(r => r.scheduledAt.startsWith(selectedDateStr ?? '')) ?? [];
  const selectedGoals = goals?.filter(g => g.targetDate === selectedDateStr) ?? [];

  return (
    <>
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 glass-1 rounded-input">
          <ChevronLeft size={16} className="text-content-secondary" />
        </button>
        <p className="text-base font-semibold text-content-primary">{format(currentMonth, 'MMMM yyyy')}</p>
        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 glass-1 rounded-input">
          <ChevronRight size={16} className="text-content-secondary" />
        </button>
      </div>

      {/* Calendar grid */}
      <GlassCard padding="sm">
        <div className="grid grid-cols-7 mb-2">
          {dayLabels.map((d, i) => (
            <div key={i} className="text-center text-[10px] font-medium text-content-muted py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {days.map(day => {
            const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
            const events = getEvents(day);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const today = isToday(day);
            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(isSameDay(day, selectedDate ?? new Date(0)) ? null : day)}
                className={`flex flex-col items-center py-1.5 rounded-input transition-all ${
                  isSelected ? 'accent-gradient text-white' :
                  today ? 'glass-elevated text-accent font-semibold' : ''
                }`}
              >
                <span className={`text-xs ${!isCurrentMonth ? 'text-content-dim' : isSelected ? 'text-white' : today ? 'text-accent' : 'text-content-primary'}`}>
                  {format(day, 'd')}
                </span>
                {events.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5">
                    {events.slice(0, 3).map((e, i) => (
                      <div key={i} className="w-1 h-1 rounded-full" style={{ backgroundColor: isSelected ? 'white' : e.color }} />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </GlassCard>

      {/* Day detail */}
      {selectedDate && (
        <GlassCard>
          <p className="text-sm font-semibold text-content-primary mb-3">{format(selectedDate, 'EEEE, dd MMMM')}</p>
          {!selectedTasks.length && !selectedReminders.length && !selectedGoals.length ? (
            <p className="text-sm text-content-muted">Nothing scheduled</p>
          ) : (
            <div className="flex flex-col gap-2">
              {selectedTasks.map(t => (
                <div key={t.id} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-accent shrink-0" />
                  <p className="text-sm text-content-secondary">{t.title}</p>
                  <Badge variant={`priority-${t.priority}` as any} size="xs">{t.priority}</Badge>
                </div>
              ))}
              {selectedReminders.map(r => (
                <div key={r.id} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-danger shrink-0" />
                  <p className="text-sm text-content-secondary">{r.title}</p>
                </div>
              ))}
              {selectedGoals.map(g => (
                <div key={g.id} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-warning shrink-0" />
                  <p className="text-sm text-content-secondary">{g.title} (deadline)</p>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      )}
    </>
  );
}

function AgendaView() {
  const tasks = useLiveQuery(
    () => db.tasks.where('status').equals('pending').filter(t => !!t.dueDate).sortBy('dueDate').then(r => r.slice(0, 30)),
    [], [],
  );
  const reminders = useLiveQuery(
    () => db.reminders.where('status').equals('pending').sortBy('scheduledAt').then(r => r.slice(0, 20)),
    [], [],
  );

  const events: { date: string; label: string; type: 'task' | 'reminder'; color: string }[] = [
    ...(tasks ?? []).map(t => ({ date: t.dueDate!, label: t.title, type: 'task' as const, color: '#6366f1' })),
    ...(reminders ?? []).map(r => ({ date: r.scheduledAt.slice(0, 10), label: r.title, type: 'reminder' as const, color: '#ef4444' })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  if (!events.length) return <EmptyState icon={<CalendarDays size={24} />} title="No upcoming events" />;

  return (
    <div className="flex flex-col gap-2">
      {events.map((ev, i) => (
        <GlassCard key={i} padding="sm">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-8 rounded-full shrink-0" style={{ backgroundColor: ev.color }} />
            <div>
              <p className="text-sm text-content-primary">{ev.label}</p>
              <p className="text-xs text-content-muted">{formatDate(ev.date)}</p>
            </div>
            <Badge variant={ev.type === 'task' ? 'accent' : 'danger'} size="xs" className="ml-auto">{ev.type}</Badge>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}

function RemindersView() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [scheduledDate, setScheduledDate] = useState(todayStr());
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [repeat, setRepeat] = useState<'once' | 'daily' | 'weekly' | 'monthly'>('once');

  const reminders = useLiveQuery(() => db.reminders.orderBy('scheduledAt').toArray(), [], []);

  const saveReminder = async () => {
    if (!title.trim()) return;
    await db.reminders.add({
      title: title.trim(),
      scheduledAt: `${scheduledDate}T${scheduledTime}:00`,
      repeat, type: 'general', status: 'pending',
      createdAt: new Date().toISOString(),
    });
    toast.success('Reminder set!');
    setTitle(''); setIsFormOpen(false);
  };

  const dismiss = async (id: number) => {
    await db.reminders.update(id, { status: 'dismissed' });
  };

  return (
    <>
      <div className="flex justify-end">
        <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={() => setIsFormOpen(true)}>Add Reminder</Button>
      </div>

      {!reminders?.length ? (
        <EmptyState icon={<Bell size={24} />} title="No reminders" action={{ label: 'Add Reminder', onClick: () => setIsFormOpen(true) }} />
      ) : (
        <div className="flex flex-col gap-2">
          {reminders.map(r => (
            <GlassCard key={r.id} padding="sm">
              <div className="flex items-center gap-3">
                <Bell size={16} className="text-accent shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-content-primary">{r.title}</p>
                  <p className="text-xs text-content-muted">{formatDate(r.scheduledAt.slice(0, 10))} · {r.repeat}</p>
                </div>
                <div className="flex gap-1">
                  <Badge variant={r.status === 'pending' ? 'accent' : 'default'} size="xs">{r.status}</Badge>
                  <button onClick={() => dismiss(r.id!)} className="p-1 glass-1 rounded text-content-muted hover:text-warning text-xs">Dismiss</button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <BottomSheet open={isFormOpen} onClose={() => setIsFormOpen(false)} title="Add Reminder">
        <div className="flex flex-col gap-4">
          <Input label="Title *" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Take vitamins" autoFocus />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Date" type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} />
            <Input label="Time" type="time" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} />
          </div>
          <Select label="Repeat" value={repeat} onChange={e => setRepeat(e.target.value as any)} options={[
            { value: 'once', label: 'Once' }, { value: 'daily', label: 'Daily' },
            { value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' },
          ]} />
          <Button variant="primary" onClick={saveReminder} disabled={!title.trim()}>Set Reminder</Button>
        </div>
      </BottomSheet>
    </>
  );
}
