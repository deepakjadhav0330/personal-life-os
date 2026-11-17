import { handleCors, json, error } from '../_shared/cors.ts';
import { getServiceClient, validateUser } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') return error('Method not allowed', 405);

  const supabase = getServiceClient();
  const user = await validateUser(req, supabase);
  if (!user) return error('Unauthorized', 401);

  let body: { session_key: string; ended_at?: string; is_estimated?: boolean };
  try { body = await req.json(); }
  catch { return error('Invalid JSON body', 400); }

  if (!body.session_key) return error('session_key is required', 400);

  const endedAt = body.ended_at ?? new Date().toISOString();

  // Compute duration from started_at
  const { data: existing } = await supabase
    .from('user_sessions')
    .select('id, started_at, user_id')
    .eq('session_key', body.session_key)
    .single();

  if (!existing) return json({ updated: false });
  if (existing.user_id !== user.id) return error('Forbidden', 403);

  const durationSeconds = Math.round(
    (new Date(endedAt).getTime() - new Date(existing.started_at).getTime()) / 1000,
  );

  await supabase
    .from('user_sessions')
    .update({
      ended_at:         endedAt,
      duration_seconds: Math.max(0, durationSeconds),
      is_estimated_end: body.is_estimated ?? false,
    })
    .eq('id', existing.id);

  return json({ updated: true });
});
