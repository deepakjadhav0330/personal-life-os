/**
 * DeepLinkHandler
 * ───────────────
 * Reads URL search params when the app opens (e.g. from an iOS Shortcut)
 * and dispatches the appropriate navigation + state so the right form
 * opens automatically.
 *
 * Supported params (passed after the hash in the URL):
 *   ?q=lunch+450          → pre-fills Quick-Add bar with "lunch 450"
 *   ?action=expense       → Finance page, expense form open
 *   ?action=income        → Finance page, income form open
 *   ?action=task          → Tasks page, add-task form open
 *   ?action=habit         → Habits page (today's checklist)
 *   ?action=weight        → Fitness → Body tab
 *   ?action=water         → Fitness → Nutrition tab
 *   ?action=workout       → Fitness → Workouts tab
 *   ?action=journal       → Journal page, editor open
 *
 * Example full URLs (installed PWA):
 *   https://deepakjadhav0330.github.io/personal-life-os/#/?action=expense
 *   https://deepakjadhav0330.github.io/personal-life-os/#/?q=lunch+450
 *
 * This component renders nothing — it's a pure effect.
 */
import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

export function DeepLinkHandler() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const action = params.get('action');
    const q      = params.get('q');

    if (!action && !q) return;

    // Clear params from the URL immediately so they don't persist on reload
    setParams({}, { replace: true });

    // ── Quick-Add pre-fill ─────────────────────────────
    if (q) {
      navigate('/', { state: { quickAdd: decodeURIComponent(q.replace(/\+/g, ' ')) }, replace: false });
      return;
    }

    // ── Action deep links ──────────────────────────────
    switch (action) {
      case 'expense':
        navigate('/finance', { state: { autoOpen: 'expense' } });
        break;
      case 'income':
        navigate('/finance', { state: { autoOpen: 'income' } });
        break;
      case 'task':
        navigate('/tasks', { state: { autoOpen: true } });
        break;
      case 'habit':
        navigate('/habits');
        break;
      case 'weight':
        navigate('/fitness', { state: { autoTab: 'body', autoOpen: 'weight' } });
        break;
      case 'water':
        navigate('/fitness', { state: { autoTab: 'nutrition' } });
        break;
      case 'workout':
        navigate('/fitness', { state: { autoTab: 'workouts' } });
        break;
      case 'journal':
        navigate('/journal', { state: { autoOpen: true } });
        break;
      default:
        break;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount only

  return null;
}
