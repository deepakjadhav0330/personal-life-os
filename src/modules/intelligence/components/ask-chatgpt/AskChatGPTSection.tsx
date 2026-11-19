import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { MessageSquare, ExternalLink, Copy, Check, ArrowLeft, ArrowRight } from 'lucide-react';
import { GlassCard, Button } from '../../../../components/ui';
import { CategorySelector } from './CategorySelector';
import { PromptPreview } from './PromptPreview';
import { buildCategorySummaries, type ChatGPTCategory } from '../../insightEngine/chatgpt/summaryBuilder';
import { buildChatGPTPrompt } from '../../insightEngine/chatgpt/promptBuilder';
import type { InsightGroup, Insight } from '../../insightEngine/insightTypes';
import type {
  Transaction, Budget, Habit, HabitCompletion,
  Workout, BodyMeasurement, NutritionLog,
  Goal, Milestone, Task, LearningItem, LearningSession,
} from '../../../../db/schema';

type Step = 'select' | 'preview';

interface AskChatGPTSectionProps {
  groups: InsightGroup[];
  insights: Insight[];
  // Raw data passed through for the summary builder
  transactions:     Transaction[];
  budgets:          Budget[];
  currency:         string;
  habits:           Habit[];
  habitCompletions: HabitCompletion[];
  weekStartsOn:     0 | 1;
  goals:            Goal[];
  milestones:       Milestone[];
  tasks:            Task[];
  workouts:         Workout[];
  bodyMeasurements: BodyMeasurement[];
  nutritionLogs:    NutritionLog[];
  learningItems:    LearningItem[];
  learningSessions: LearningSession[];
  weightUnit:       'kg' | 'lbs';
  userName:         string;
}

export function AskChatGPTSection(props: AskChatGPTSectionProps) {
  const { groups, insights, userName } = props;

  const [step, setStep]           = useState<Step>('select');
  const [selected, setSelected]   = useState<Set<ChatGPTCategory>>(new Set());
  const [prompt, setPrompt]       = useState('');
  const [copied, setCopied]       = useState(false);
  const [clipFail, setClipFail]   = useState(false);

  const hasSelection = selected.size > 0;
  const reportingPeriod = format(new Date(), 'MMMM yyyy');

  // ── Generate prompt ───────────────────────────────────────
  const generatePrompt = useCallback(() => {
    const summaries = buildCategorySummaries([...selected] as ChatGPTCategory[], {
      transactions:     props.transactions,
      budgets:          props.budgets,
      currency:         props.currency,
      habits:           props.habits,
      habitCompletions: props.habitCompletions,
      weekStartsOn:     props.weekStartsOn,
      goals:            props.goals,
      milestones:       props.milestones,
      tasks:            props.tasks,
      workouts:         props.workouts,
      bodyMeasurements: props.bodyMeasurements,
      nutritionLogs:    props.nutritionLogs,
      learningItems:    props.learningItems,
      learningSessions: props.learningSessions,
      weightUnit:       props.weightUnit,
    });

    // Only include insights for selected categories
    const relevantInsights = insights.filter(i =>
      selected.has(i.category as ChatGPTCategory),
    );

    const built = buildChatGPTPrompt({
      userName:        userName || undefined,
      reportingPeriod,
      summaries,
      insights:        relevantInsights,
    });

    setPrompt(built);
    setStep('preview');
    setCopied(false);
    setClipFail(false);
  }, [selected, insights, userName, reportingPeriod, props]);

  // ── Copy to clipboard ─────────────────────────────────────
  const copyPrompt = useCallback(async () => {
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard unavailable — show fallback textarea
      setClipFail(true);
    }
  }, [prompt]);

  const openChatGPT = useCallback(() => {
    window.open('https://chatgpt.com', '_blank', 'noopener,noreferrer');
  }, []);

  // ── Select step ───────────────────────────────────────────
  const SelectStep = (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs text-content-secondary leading-relaxed">
          Select which parts of your Life OS data to include. Only aggregated summaries are shared — no raw transactions, personal details, or sensitive records.
        </p>
      </div>

      <CategorySelector
        selected={selected}
        onChange={setSelected}
        groups={groups}
      />

      <Button
        variant="primary"
        size="sm"
        disabled={!hasSelection}
        rightIcon={<ArrowRight size={14} />}
        onClick={generatePrompt}
      >
        Generate prompt
      </Button>
    </div>
  );

  // ── Preview step ──────────────────────────────────────────
  const PreviewStep = (
    <div className="flex flex-col gap-4">
      <PromptPreview prompt={prompt} />

      {/* Clipboard fallback */}
      {clipFail && (
        <div className="flex flex-col gap-1">
          <p className="text-xs text-amber-400">
            Clipboard access was blocked. Select all text below and copy manually:
          </p>
          <textarea
            readOnly
            value={prompt}
            rows={6}
            className="glass-1 rounded-card text-[11px] text-content-secondary font-mono p-3 resize-none w-full border border-white/[0.06] focus:outline-none"
            onClick={e => (e.target as HTMLTextAreaElement).select()}
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft size={14} />}
          onClick={() => { setStep('select'); setClipFail(false); }}
        >
          Back
        </Button>

        <Button
          variant="secondary"
          size="sm"
          leftIcon={copied ? <Check size={14} /> : <Copy size={14} />}
          onClick={copyPrompt}
          className={copied ? 'text-green-400' : ''}
        >
          {copied ? 'Copied!' : 'Copy prompt'}
        </Button>

        <Button
          variant="primary"
          size="sm"
          rightIcon={<ExternalLink size={14} />}
          onClick={openChatGPT}
        >
          Open ChatGPT
        </Button>
      </div>

      <p className="text-[10px] text-content-muted">
        Paste the copied prompt into ChatGPT. Life OS does not connect to ChatGPT automatically — no data is transmitted without your action.
      </p>
    </div>
  );

  return (
    <GlassCard padding="none">
      {/* Section header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-white/[0.06]">
        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
          <MessageSquare size={15} className="text-emerald-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-content-primary">Ask ChatGPT</p>
          <p className="text-[11px] text-content-muted">Free · No API key · Manual copy-paste</p>
        </div>
      </div>

      <div className="p-4">
        {step === 'select'  && SelectStep}
        {step === 'preview' && PreviewStep}
      </div>
    </GlassCard>
  );
}
