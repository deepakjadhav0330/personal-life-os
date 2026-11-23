import { handleCors, json, error } from '../_shared/cors.ts';
import { getServiceClient, validateUser } from '../_shared/supabase.ts';

interface IncomingEvent {
  event_key: string;
  event_name: string;
  properties: Record<string, unknown>;
  occurred_at: string;
  session_id?: string;
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') return error('Method not allowed', 405);

  const supabase = getServiceClient();
  const user = await validateUser(req, supabase);
  if (!user) return error('Unauthorized', 401);

  // Check profile status — suspended users cannot ingest events.
  // If the profile lookup itself fails (e.g., transient DB issue) we still
  // accept the events from a validly authenticated user to avoid silent
  // data loss. The profile-not-found case returns 404 so the client can
  // distinguish it from a 403 suspension and retry rather than drop.
  const { data: profile } = await supabase
    .from('profiles')
    .select('status')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.status === 'suspended') return error('Account suspended', 403);
  // No profile row at all — user is authenticated but profile isn't ready yet.
  // Return 404 so the client retries instead of permanently dropping events.
  if (profile === null) return error('Profile not found', 404);

  let body: { events?: IncomingEvent[] };
  try { body = await req.json(); }
  catch { return error('Invalid JSON body', 400); }

  const events = body.events;
  if (!Array.isArray(events) || events.length === 0) return json({ ingested: 0 });
  if (events.length > 50) return error('Maximum 50 events per batch', 400);

  // Build insert rows — user_id always comes from the JWT, never from the request body
  const rows = events.map(evt => ({
    user_id:     user.id,              // identity from JWT — cannot be forged
    event_name:  String(evt.event_name ?? '').slice(0, 100),
    event_key:   String(evt.event_key ?? '').slice(0, 64),
    session_id:  evt.session_id ?? null,
    properties:  sanitizeProperties(evt.properties ?? {}),
    occurred_at: evt.occurred_at ?? new Date().toISOString(),
  }));

  // ON CONFLICT (event_key) DO NOTHING — deduplication
  const { error: insertError, count } = await supabase
    .from('analytics_events')
    .upsert(rows, { onConflict: 'event_key', ignoreDuplicates: true })
    .select();

  if (insertError) {
    console.error('[ingest-events] insert error:', insertError);
    return error('Failed to ingest events', 500);
  }

  // Update last_active_at on the profile
  await supabase
    .from('profiles')
    .update({ last_active_at: new Date().toISOString() })
    .eq('id', user.id);

  return json({ ingested: count ?? rows.length });
});

// Strip any keys not in the allowed list to ensure no personal data leaks in
const ALLOWED_PROPS = new Set([
  'platform', 'app_version', 'session_key', 'duration_seconds', 'is_estimated',
  'module_name', 'priority', 'has_due_date', 'is_recurring', 'frequency',
  'category', 'exercise_count', 'duration_minutes', 'measurement_type',
  'transaction_type', 'meal_name', 'entry_type', 'has_mood', 'progress_mode',
  'repeat_type', 'result_type', 'item_type',
]);

function sanitizeProperties(raw: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (ALLOWED_PROPS.has(k) && (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean')) {
      safe[k] = typeof v === 'string' ? v.slice(0, 200) : v;
    }
  }
  return safe;
}
