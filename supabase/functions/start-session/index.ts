import { handleCors, json, error } from '../_shared/cors.ts';
import { getServiceClient, validateUser } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') return error('Method not allowed', 405);

  const supabase = getServiceClient();
  const user = await validateUser(req, supabase);
  if (!user) return error('Unauthorized', 401);

  let body: { session_key: string; started_at: string; platform?: string; app_version?: string };
  try { body = await req.json(); }
  catch { return error('Invalid JSON body', 400); }

  if (!body.session_key) return error('session_key is required', 400);

  // ON CONFLICT (session_key) DO NOTHING — page refresh idempotency
  const { data, error: insertError } = await supabase
    .from('user_sessions')
    .upsert({
      user_id:     user.id,
      session_key: body.session_key,
      started_at:  body.started_at ?? new Date().toISOString(),
      platform:    body.platform ?? 'web',
      app_version: body.app_version ?? null,
    }, { onConflict: 'session_key', ignoreDuplicates: true })
    .select('id')
    .single();

  if (insertError && insertError.code !== '23505') {
    // 23505 = unique violation (already exists) — that's fine
    console.error('[start-session] error:', insertError);
    return error('Failed to create session', 500);
  }

  // Fetch the session ID regardless
  const { data: session } = await supabase
    .from('user_sessions')
    .select('id')
    .eq('session_key', body.session_key)
    .single();

  return json({ id: (data ?? session)?.id ?? body.session_key });
});
