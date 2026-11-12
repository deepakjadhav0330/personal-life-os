import { format } from 'date-fns';
import { useSetting } from '../../hooks/useSetting';
import { GlassCard } from '../ui/GlassCard';
import { getTimeGreeting } from '../../utils/dates';

export function GreetingWidget() {
  const [name] = useSetting('name', '');
  const greeting = getTimeGreeting();
  const today = format(new Date(), 'EEEE, dd MMMM');

  return (
    <GlassCard className="col-span-full" padding="lg">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-content-muted text-sm mb-1">{today}</p>
          <h2 className="text-2xl font-bold text-content-primary">
            {greeting}{name ? `, ${name}` : ''} 👋
          </h2>
          <p className="text-content-secondary text-sm mt-1">
            {getMotivationalLine()}
          </p>
        </div>
        <div className="text-3xl">{getTimeEmoji()}</div>
      </div>
    </GlassCard>
  );
}

function getTimeEmoji(): string {
  const h = new Date().getHours();
  if (h < 6) return '🌙';
  if (h < 12) return '☀️';
  if (h < 17) return '🌤️';
  if (h < 20) return '🌆';
  return '🌙';
}

function getMotivationalLine(): string {
  const lines = [
    "Let's make today count.",
    "Small steps lead to big changes.",
    "Consistency is the key to progress.",
    "Focus on what matters most today.",
    "Every day is a fresh start.",
    "One task at a time. You've got this.",
  ];
  return lines[new Date().getDay() % lines.length];
}
