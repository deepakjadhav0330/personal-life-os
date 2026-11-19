// ─────────────────────────────────────────────────────────────
// Life OS Intelligence — Shared Utilities
// Pure helpers: period math, deterministic hashing, dismiss persistence.
// No side effects except the dismiss localStorage functions.
// ─────────────────────────────────────────────────────────────

import {
  format,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfWeek,
  endOfWeek,
  subWeeks,
  getDate,
} from 'date-fns';
import type { InsightCategory } from './insightTypes';

// ─── Date / period helpers ────────────────────────────────────

export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export interface MonthRange {
  start: string;    // YYYY-MM-DD (1st of month)
  end: string;      // YYYY-MM-DD (last of month)
  key: string;      // YYYY-MM
  year: number;
  month: number;    // 1-based
}

/** Returns the last n complete calendar months, most recent first. */
export function getPreviousCompleteMonths(n: number): MonthRange[] {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = subMonths(now, i + 1);
    return {
      start: format(startOfMonth(d), 'yyyy-MM-dd'),
      end:   format(endOfMonth(d),   'yyyy-MM-dd'),
      key:   format(d, 'yyyy-MM'),
      year:  d.getFullYear(),
      month: d.getMonth() + 1,
    };
  });
}

export interface MTDInfo {
  /** YYYY-MM-DD — 1st of current month */
  start: string;
  /** YYYY-MM-DD — today */
  today: string;
  dayOfMonth: number;
  monthKey: string;   // YYYY-MM
  daysInMonth: number;
  daysRemaining: number;
}

/** Current month-to-date metadata. */
export function currentMTD(): MTDInfo {
  const now         = new Date();
  const monthStart  = startOfMonth(now);
  const monthEnd    = endOfMonth(now);
  const day         = getDate(now);
  const daysInMonth = getDate(monthEnd);
  return {
    start:         format(monthStart, 'yyyy-MM-dd'),
    today:         format(now,        'yyyy-MM-dd'),
    dayOfMonth:    day,
    monthKey:      format(now, 'yyyy-MM'),
    daysInMonth,
    daysRemaining: daysInMonth - day,
  };
}

/**
 * Returns the fair MTD end date for a historical month
 * (day 1 to day N, capped at the last day of that month).
 */
export function historicalMTDEnd(year: number, month: number, dayOfMonth: number): string {
  const lastDay = getDate(endOfMonth(new Date(year, month - 1, 1)));
  const capped  = Math.min(dayOfMonth, lastDay);
  return `${year}-${String(month).padStart(2, '0')}-${String(capped).padStart(2, '0')}`;
}

export interface WeekRange {
  start: string;  // YYYY-MM-DD
  end: string;    // YYYY-MM-DD
}

export function thisWeekRange(weekStartsOn: 0 | 1 = 1): WeekRange {
  const now = new Date();
  return {
    start: format(startOfWeek(now, { weekStartsOn }), 'yyyy-MM-dd'),
    end:   format(endOfWeek(now,   { weekStartsOn }), 'yyyy-MM-dd'),
  };
}

export function lastWeekRange(weekStartsOn: 0 | 1 = 1): WeekRange {
  const last = subWeeks(new Date(), 1);
  return {
    start: format(startOfWeek(last, { weekStartsOn }), 'yyyy-MM-dd'),
    end:   format(endOfWeek(last,   { weekStartsOn }), 'yyyy-MM-dd'),
  };
}

/** Inclusive date range for the last n days ending today. */
export function lastNDaysRange(n: number): WeekRange {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - (n - 1));
  return {
    start: format(start, 'yyyy-MM-dd'),
    end:   format(now,   'yyyy-MM-dd'),
  };
}

// ─── Hashing ─────────────────────────────────────────────────

/**
 * Creates a deterministic hash string from an object of key metrics.
 * Keys are sorted before serialising for stability.
 * Used to detect when the underlying data for an insight has changed,
 * allowing a dismissed insight to automatically re-surface.
 */
export function hashMetrics(metrics: Record<string, unknown>): string {
  try {
    const sorted = Object.keys(metrics)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => { acc[k] = metrics[k]; return acc; }, {});
    return btoa(unescape(encodeURIComponent(JSON.stringify(sorted))));
  } catch {
    // Fallback: will never match a stored hash, so dismissed state resets
    return `fallback-${Date.now()}`;
  }
}

// ─── Dismiss persistence (localStorage) ──────────────────────

const DISMISS_KEY = 'life_os_dismissed_insights';
export type DismissMap = Record<string, string>; // insightId → dataHash

export function getDismissedMap(): DismissMap {
  try {
    const v = localStorage.getItem(DISMISS_KEY);
    return v ? (JSON.parse(v) as DismissMap) : {};
  } catch {
    return {};
  }
}

/** Persist a dismissal at the current data hash. */
export function persistDismissInsight(id: string, dataHash: string): void {
  try {
    const map = getDismissedMap();
    map[id]   = dataHash;
    localStorage.setItem(DISMISS_KEY, JSON.stringify(map));
  } catch { /* localStorage unavailable */ }
}

/** Remove a dismissal so the insight re-appears on next render. */
export function persistUndismissInsight(id: string): void {
  try {
    const map = getDismissedMap();
    delete map[id];
    localStorage.setItem(DISMISS_KEY, JSON.stringify(map));
  } catch { /* localStorage unavailable */ }
}

/**
 * Returns true only if the insight was previously dismissed
 * AND the data hash has not changed since dismissal.
 * If the hash changed (data changed), the insight re-surfaces.
 */
export function isInsightDismissed(id: string, currentHash: string, map: DismissMap): boolean {
  return Object.prototype.hasOwnProperty.call(map, id) && map[id] === currentHash;
}

// ─── Misc ─────────────────────────────────────────────────────

export const CATEGORY_LABELS: Record<InsightCategory, string> = {
  finance:        'Finance',
  fitness:        'Fitness',
  habits:         'Habits',
  goals:          'Goals',
  tasks:          'Tasks',
  learning:       'Learning',
  daily_activity: 'Daily Activity',
};

/** Safe percentage: (part / total) * 100, returns 0 when total is 0. */
export function safePct(part: number, total: number): number {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}
