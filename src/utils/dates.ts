import { format, isToday, isTomorrow, isYesterday, isPast, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

export function formatDate(dateStr: string, fmt = 'dd MMM yyyy'): string {
  try { return format(parseISO(dateStr), fmt); } catch { return dateStr; }
}

export function formatDateRelative(dateStr: string): string {
  try {
    const d = parseISO(dateStr);
    if (isToday(d)) return 'Today';
    if (isTomorrow(d)) return 'Tomorrow';
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'dd MMM');
  } catch { return dateStr; }
}

export function formatDateLong(dateStr: string): string {
  try { return format(parseISO(dateStr), 'EEEE, dd MMMM yyyy'); } catch { return dateStr; }
}

export function todayStr(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function isOverdue(dueDate: string): boolean {
  if (!dueDate) return false;
  try {
    const d = parseISO(dueDate);
    return isPast(d) && !isToday(d);
  } catch { return false; }
}

export function getWeekRange(date: Date = new Date(), weekStartsOn: 0 | 1 = 1): { start: Date; end: Date } {
  return {
    start: startOfWeek(date, { weekStartsOn }),
    end: endOfWeek(date, { weekStartsOn }),
  };
}

export function getMonthRange(date: Date = new Date()): { start: Date; end: Date } {
  return { start: startOfMonth(date), end: endOfMonth(date) };
}

export function getMonthDays(date: Date = new Date()): Date[] {
  return eachDayOfInterval({ start: startOfMonth(date), end: endOfMonth(date) });
}

export function getLast30Days(): Date[] {
  const days: Date[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  return days;
}

export function getLast7Days(): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
}

export function getTimeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function parseDateStr(str: string): Date {
  return parseISO(str);
}

export function isSameDay(a: string, b: string): boolean {
  return a.slice(0, 10) === b.slice(0, 10);
}

export function getDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return format(d, 'yyyy-MM-dd');
}
