// ─── Currency formatting ─────────────────────────────────────
const CURRENCY_LOCALES: Record<string, string> = {
  INR: 'en-IN', USD: 'en-US', EUR: 'de-DE', GBP: 'en-GB',
  AED: 'ar-AE', SGD: 'en-SG', JPY: 'ja-JP', AUD: 'en-AU',
};

export function formatCurrency(amount: number, currency = 'INR'): string {
  const locale = CURRENCY_LOCALES[currency] || 'en-IN';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCurrencyCompact(amount: number, currency = 'INR'): string {
  if (amount >= 100000) return `${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)}k`;
  return formatCurrency(amount, currency);
}

// ─── Number formatting ───────────────────────────────────────
export function formatNumber(n: number, decimals = 1): string {
  return n % 1 === 0 ? n.toString() : n.toFixed(decimals);
}

export function formatWeight(value: number, unit: 'kg' | 'lbs' = 'kg'): string {
  if (unit === 'lbs') return `${formatNumber(value * 2.2046)} lbs`;
  return `${formatNumber(value)} kg`;
}

export function formatDelta(current: number, previous: number, unit = ''): string {
  const delta = current - previous;
  const sign = delta > 0 ? '+' : '';
  return `${sign}${formatNumber(delta)}${unit}`;
}

// ─── Percentage ──────────────────────────────────────────────
export function formatPercent(value: number, total: number): string {
  if (total === 0) return '0%';
  return `${Math.round((value / total) * 100)}%`;
}

// ─── Duration ───────────────────────────────────────────────
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function formatMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} hr`;
  return `${h}h ${m}m`;
}

// ─── Macro / nutrition ──────────────────────────────────────
export function formatMacro(value: number): string {
  return `${Math.round(value)}g`;
}

export function macroProgress(consumed: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(Math.round((consumed / target) * 100), 100);
}

// ─── Misc ───────────────────────────────────────────────────
export function capitalize(s: string): string {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
}

export function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

export function getInitials(name: string): string {
  if (!name.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
