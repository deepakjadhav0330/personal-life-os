import { PageHeader } from '../../components/layout/PageHeader';
import { GlassCard } from '../../components/ui';
import { Smartphone } from 'lucide-react';

export function InstallGuidePage() {
  const url = window.location.origin;

  const steps = [
    { icon: '🌐', title: 'Open in Safari on your iPhone', desc: `Navigate to ${url} using Safari. The app will not install from Chrome or other browsers on iOS.` },
    { icon: '⬆️', title: 'Tap the Share button', desc: 'At the bottom of Safari, tap the Share icon (the box with an arrow pointing up).' },
    { icon: '📌', title: 'Tap "Add to Home Screen"', desc: 'Scroll down in the Share sheet and tap "Add to Home Screen".' },
    { icon: '✅', title: 'Tap "Add"', desc: 'In the top right corner of the prompt, tap "Add" to confirm.' },
    { icon: '🚀', title: 'Open from your Home Screen', desc: 'Find the "Life OS" icon on your iPhone Home Screen and tap it. The app opens full-screen with no browser chrome.' },
  ];

  return (
    <div className="min-h-screen-dvh">
      <PageHeader title="Install on iPhone" back />
      <div className="px-4 pb-4 flex flex-col gap-4">

        <GlassCard className="border-accent/20 text-center py-6">
          <div className="w-16 h-16 rounded-2xl accent-gradient mx-auto mb-3 flex items-center justify-center">
            <Smartphone size={28} className="text-white" />
          </div>
          <p className="text-lg font-bold text-content-primary mb-1">Add Life OS to your iPhone</p>
          <p className="text-sm text-content-secondary">Follow these 5 steps to install the app on your Home Screen</p>
        </GlassCard>

        <GlassCard padding="sm">
          <p className="text-xs font-semibold text-content-muted uppercase tracking-wide mb-1">App URL</p>
          <p className="text-sm font-mono text-accent break-all">{url}</p>
          <p className="text-xs text-content-muted mt-1">Share this URL with yourself (AirDrop, iMessage, Notes)</p>
        </GlassCard>

        <div className="flex flex-col gap-3">
          {steps.map((step, i) => (
            <GlassCard key={i} padding="sm">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full accent-gradient text-white text-sm font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{step.icon}</span>
                    <p className="text-sm font-semibold text-content-primary">{step.title}</p>
                  </div>
                  <p className="text-xs text-content-secondary leading-relaxed">{step.desc}</p>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>

        <GlassCard>
          <p className="text-xs font-semibold text-content-muted uppercase tracking-wide mb-2">Important Notes</p>
          <div className="flex flex-col gap-2 text-sm text-content-secondary">
            <p>• Works on iOS 14+ (iOS 15.4+ for best experience)</p>
            <p>• Web push notifications require iOS 16.4+ and the installed PWA</p>
            <p>• The app works fully offline once installed</p>
            <p>• Your data stays on your iPhone — not synced to any server</p>
          </div>
        </GlassCard>

      </div>
    </div>
  );
}
