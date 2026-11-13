import { useState } from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { GlassCard } from '../../components/ui';
import { Copy, Check, Zap } from 'lucide-react';
import { toast } from '../../stores/useToastStore';

const BASE_URL = 'https://deepakjadhav0330.github.io/personal-life-os/#/';

// ── Deep link catalogue ──────────────────────────────────────
const SHORTCUTS = [
  {
    id: 'expense',
    siri: 'Log expense',
    emoji: '💸',
    color: '#f59e0b',
    description: 'Opens Finance with the expense form ready',
    url: `${BASE_URL}?action=expense`,
  },
  {
    id: 'income',
    siri: 'Log income',
    emoji: '📈',
    color: '#22c55e',
    description: 'Opens Finance with the income form ready',
    url: `${BASE_URL}?action=income`,
  },
  {
    id: 'task',
    siri: 'Add task',
    emoji: '☑',
    color: '#6366f1',
    description: 'Opens Tasks with the add-task form ready',
    url: `${BASE_URL}?action=task`,
  },
  {
    id: 'journal',
    siri: 'Open journal',
    emoji: '📓',
    color: '#8b5cf6',
    description: 'Opens Journal with the editor ready',
    url: `${BASE_URL}?action=journal`,
  },
  {
    id: 'weight',
    siri: 'Log weight',
    emoji: '⚖️',
    color: '#8b5cf6',
    description: 'Opens Fitness → Body tab',
    url: `${BASE_URL}?action=weight`,
  },
  {
    id: 'workout',
    siri: 'Start workout',
    emoji: '🏋️',
    color: '#22c55e',
    description: 'Opens Fitness → Workouts tab',
    url: `${BASE_URL}?action=workout`,
  },
  {
    id: 'water',
    siri: 'Log water',
    emoji: '💧',
    color: '#3b82f6',
    description: 'Opens Fitness → Nutrition tab',
    url: `${BASE_URL}?action=water`,
  },
  {
    id: 'habit',
    siri: 'Check habits',
    emoji: '🔥',
    color: '#f59e0b',
    description: 'Opens today\'s habit checklist',
    url: `${BASE_URL}?action=habit`,
  },
];

// ── Copy button ───────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy — select the text manually');
    }
  };

  return (
    <button
      onClick={copy}
      className="w-9 h-9 flex items-center justify-center glass-1 hover:glass-2 rounded-input transition-all shrink-0"
      aria-label="Copy URL"
    >
      {copied
        ? <Check size={14} className="text-success" />
        : <Copy size={14} className="text-content-muted" />}
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────
export function ShortcutsGuidePage() {
  return (
    <div className="min-h-screen-dvh">
      <PageHeader title="iOS Shortcuts" back />

      <div className="px-4 pb-4 flex flex-col gap-4">

        {/* Hero */}
        <GlassCard className="border-accent/20 text-center py-5">
          <div className="w-14 h-14 rounded-2xl accent-gradient mx-auto mb-3 flex items-center justify-center">
            <Zap size={26} className="text-white" />
          </div>
          <p className="text-base font-bold text-content-primary mb-1">
            "Hey Siri, log expense"
          </p>
          <p className="text-sm text-content-secondary leading-relaxed">
            Use the iOS Shortcuts app to open Life OS directly on any form —
            hands-free, one tap.
          </p>
        </GlassCard>

        {/* Power shortcut — Ask for Input */}
        <GlassCard className="border-warning/20">
          <div className="flex items-start gap-3 mb-4">
            <span className="text-2xl">⚡</span>
            <div>
              <p className="text-sm font-bold text-content-primary">
                Power Shortcut — Voice Quick-Add
              </p>
              <p className="text-xs text-content-secondary mt-0.5 leading-relaxed">
                Say <strong>"Hey Siri, quick add"</strong> → Siri asks what to add →
                you say "lunch 450" → app opens with the entry pre-filled and ready to save.
              </p>
            </div>
          </div>

          <p className="text-[11px] font-semibold text-content-muted uppercase tracking-widest mb-2">
            Steps in the Shortcuts app
          </p>
          {[
            { n: '1', label: 'Create a new Shortcut', desc: 'Open Shortcuts app → tap + (top right)' },
            { n: '2', label: 'Add "Ask for Input"', desc: 'Search "Ask for Input" → Prompt: "What to add?" → Input type: Text' },
            { n: '3', label: 'Add "Open URL"', desc: 'Search "Open URL"' },
            { n: '4', label: 'Set the URL', desc: `${BASE_URL}?q=` + '[Provided Input]' },
            { n: '5', label: 'Name it & add to Siri', desc: 'Name: "Quick Add" → Add to Siri → say the phrase' },
          ].map(step => (
            <div key={step.n} className="flex gap-3 mb-3 last:mb-0">
              <div className="w-6 h-6 rounded-full accent-gradient text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                {step.n}
              </div>
              <div>
                <p className="text-sm font-medium text-content-primary">{step.label}</p>
                <p className="text-xs text-content-muted">{step.desc}</p>
              </div>
            </div>
          ))}

          {/* URL for step 4 */}
          <div className="mt-3 glass-1 rounded-input p-2.5 flex items-center gap-2">
            <code className="text-xs text-accent flex-1 break-all leading-relaxed">
              {BASE_URL}?q=[Provided Input]
            </code>
            <CopyButton text={`${BASE_URL}?q=`} />
          </div>
        </GlassCard>

        {/* Individual action shortcuts */}
        <div>
          <p className="text-[11px] font-semibold text-content-muted uppercase tracking-widest mb-3">
            Pre-built Action Links
          </p>
          <p className="text-xs text-content-secondary mb-3 leading-relaxed">
            Each link opens Life OS directly on a specific form. Create a Shortcut
            with a single "Open URL" action and add it to Siri or your Home Screen.
          </p>

          <div className="flex flex-col gap-2">
            {SHORTCUTS.map(s => (
              <GlassCard key={s.id} padding="sm">
                <div className="flex items-center gap-3">
                  {/* Icon */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg"
                    style={{ background: `${s.color}1e`, border: `1px solid ${s.color}40` }}
                  >
                    {s.emoji}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-content-primary">{s.description}</p>
                    </div>
                    <p className="text-[11px] text-content-muted mt-0.5">
                      Siri phrase: <span className="text-accent font-medium">"{s.siri}"</span>
                    </p>
                    <p className="text-[10px] text-content-dim mt-1 font-mono break-all">
                      ?action={s.id}
                    </p>
                  </div>

                  <CopyButton text={s.url} />
                </div>
              </GlassCard>
            ))}
          </div>
        </div>

        {/* How to create any shortcut */}
        <GlassCard>
          <p className="text-[11px] font-semibold text-content-muted uppercase tracking-widest mb-3">
            How to create any shortcut
          </p>
          {[
            'Open the Shortcuts app on your iPhone',
            'Tap + to create a new shortcut',
            'Tap "Add Action" → search "Open URL"',
            'Paste the URL from above',
            'Tap the shortcut name at the top → rename it',
            'Tap the ⋯ menu → "Add to Siri" to set a voice phrase',
            'Or tap "Add to Home Screen" for a one-tap widget',
          ].map((step, i) => (
            <div key={i} className="flex gap-3 mb-2.5 last:mb-0">
              <span className="text-accent font-bold text-sm shrink-0">{i + 1}.</span>
              <p className="text-sm text-content-secondary">{step}</p>
            </div>
          ))}
        </GlassCard>

        {/* Test link */}
        <GlassCard padding="sm" className="border-success/20">
          <p className="text-xs text-content-muted mb-2">
            Test a link right now — tap to open the expense form:
          </p>
          <div className="flex items-center gap-2">
            <code className="text-xs text-accent flex-1 break-all">
              {BASE_URL}?action=expense
            </code>
            <CopyButton text={`${BASE_URL}?action=expense`} />
          </div>
        </GlassCard>

      </div>
    </div>
  );
}
