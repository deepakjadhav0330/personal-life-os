import { handleCors, json, error } from '../_shared/cors.ts';
import { getServiceClient, validateUser } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') return error('Method not allowed', 405);

  const supabase = getServiceClient();
  const user = await validateUser(req, supabase);
  if (!user) return error('Unauthorized', 401);

  let body: { session_key: string };
  try { body = await req.json(); }
  catch { return error('Invalid JSON body', 400); }

  if (!body.session_key) return error('session_key is required', 400);

  // Update ended_at to now — this acts as a heartbeat so duration can be estimated
  // even if the session never receives a clean end event
  await supabase
    .from('user_sessions')
    .update({ ended_at: new Date().toISOString(), is_estimated_end: true })
    .eq('session_key', body.session_key)
    .eq('user_id', user.id);

  return json({ ok: true });
});
