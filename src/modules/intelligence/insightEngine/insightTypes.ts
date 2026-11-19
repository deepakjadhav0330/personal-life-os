// ─────────────────────────────────────────────────────────────
// Life OS Intelligence — Core TypeScript Types
// All insight computation is entirely local.
// No external AI or paid service is used.
// ─────────────────────────────────────────────────────────────

export type InsightSeverity = 'positive' | 'attention' | 'critical';

export type InsightCategory =
  | 'finance'
  | 'fitness'
  | 'habits'
  | 'goals'
  | 'tasks'
  | 'learning'
  | 'daily_activity'; // Not currently supported — no step tracking table exists

export interface Insight {
  /** Deterministic string key — used for dismiss-until-changed logic */
  id: string;
  category: InsightCategory;
  title: string;
  explanation: string;
  /** e.g. "₹4,800 this month vs ₹3,900 avg" */
  supportingMetric?: string;
  /** e.g. "Last 3 complete months (day 1–19)" */
  comparisonPeriod?: string;
  severity: InsightSeverity;
  /** Short recommended action text shown below the explanation */
  recommendedAction?: string;
  /** Route path to navigate when the action button is tapped */
  actionPath?: string;
  /** YYYY-MM-DD when this insight was generated */
  generatedAt: string;
  /**
   * btoa(JSON.stringify(sortedKeyMetrics)) — a snapshot of the values
   * that produced this insight. When the hash changes (data changes),
   * a previously dismissed insight automatically re-surfaces.
   */
  dataHash: string;
}

export interface InsightGroup {
  category: InsightCategory;
  /** Human-readable category label */
  label: string;
  insights: Insight[];
  /**
   * false when the category has no data source at all.
   * Example: daily_activity — no step tracking table exists.
   * UI renders an "unavailable" state instead of an empty state.
   */
  hasData: boolean;
}

export interface OverallStatus {
  /** One-line natural-language summary of the user's current state */
  summary: string;
  positiveCount: number;
  attentionCount: number;
  criticalCount: number;
}

export interface InsightEngineResult {
  groups: InsightGroup[];
  overallStatus: OverallStatus;
  /** Top 3–5 insights sorted by severity — for the "Focus now" section */
  priorityInsights: Insight[];
  loading: boolean;
  error: string | null;
  dismissInsight: (id: string, dataHash: string) => void;
  undismissInsight: (id: string) => void;
}
