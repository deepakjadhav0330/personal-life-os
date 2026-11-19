// ─────────────────────────────────────────────────────────────
// Life OS Intelligence — ChatGPT Prompt Builder
// Assembles the final, privacy-safe plain-text prompt.
// Never includes: email, user ID, auth tokens, raw transactions,
// merchant names, session keys, or raw database records.
// ─────────────────────────────────────────────────────────────

import { format } from 'date-fns';
import type { Insight } from '../insightTypes';
import type { CategorySummary } from './summaryBuilder';
import { CATEGORY_LABELS } from '../insightUtils';

const CATEGORY_EMOJI: Record<string, string> = {
  finance: '💰',
  fitness: '💪',
  habits:  '✅',
  goals:   '🎯',
  tasks:   '📋',
  learning: '📚',
};

export interface PromptBuilderInput {
  userName?: string;
  reportingPeriod: string;  // e.g. "November 2026"
  summaries: CategorySummary[];
  insights: Insight[];
}

export function buildChatGPTPrompt(input: PromptBuilderInput): string {
  const { userName, reportingPeriod, summaries, insights } = input;
  const generatedAt = format(new Date(), 'dd MMM yyyy, HH:mm');

  const sections: string[] = [];

  // ── Header ────────────────────────────────────────────────
  sections.push(
    `Life OS — Personal Data Analysis Request`,
    `Generated: ${generatedAt}`,
    ``,
    `You are helping me analyse my personal productivity and wellness data from Life OS, a private local app that stores all data offline on my device. No data is transmitted to any server.`,
    ``,
    `Reporting period: ${reportingPeriod}${userName ? `\nUser: ${userName}` : ''}`,
  );

  // ── Data summaries ────────────────────────────────────────
  if (summaries.length > 0) {
    sections.push(``, `────────────────────────────────────────`, `📊 DATA SUMMARY`, ``);
    for (const summary of summaries) {
      const label = CATEGORY_LABELS[summary.category] ?? summary.category;
      const emoji = CATEGORY_EMOJI[summary.category] ?? '•';
      sections.push(`${emoji} ${label}:`, summary.text, ``);
    }
  }

  // ── Auto-generated insights ───────────────────────────────
  const shownCategories = new Set<string>(summaries.map(s => s.category));
  const relevantInsights = insights.filter(i => shownCategories.has(i.category));

  if (relevantInsights.length > 0) {
    sections.push(`────────────────────────────────────────`, `🔍 MY AUTO-GENERATED INSIGHTS`, ``);
    relevantInsights.forEach((ins, idx) => {
      const label = CATEGORY_LABELS[ins.category] ?? ins.category;
      sections.push(`${idx + 1}. [${label}] ${ins.title}`);
      sections.push(`   ${ins.explanation}`);
      if (ins.supportingMetric) sections.push(`   Data: ${ins.supportingMetric}`);
      sections.push(``);
    });
  }

  // ── Request ───────────────────────────────────────────────
  sections.push(
    `────────────────────────────────────────`,
    `📝 WHAT I'M ASKING`,
    ``,
    `Based on the data above, please:`,
    `1. Tell me what I am doing well — be specific and reference the numbers.`,
    `2. Identify the 2–3 most important areas that need my attention.`,
    `3. Give me 3–5 specific, actionable recommendations for the next 7 days.`,
    `4. Point out any patterns or connections across different areas.`,
    ``,
    `Please reference actual numbers from my data. Avoid generic advice.`,
    `Do not make medical diagnoses or financial advice — focus on observable patterns and practical next steps.`,
  );

  return sections.join('\n');
}
