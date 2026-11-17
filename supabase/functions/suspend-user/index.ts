import { handleCors, json, error } from '../_shared/cors.ts';
import { getServiceClient, validateAdmin } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') return error('Method not allowed', 405);

  const supabase = getServiceClient();
  const admin = await validateAdmin(req, supabase);
  if (!admin) return error('Forbidden', 403);

  let body: { userId: string; reason?: string };
  try { body = await req.json(); }
  catch { return error('Invalid JSON body', 400); }

  if (!body.userId) return error('userId is required', 400);

  const now = new Date().toISOString();

  // Update profile status
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ status: 'suspended', suspended_at: now, suspended_reason: body.reason ?? null })
    .eq('id', body.userId);

  if (profileError) return error('Failed to update profile', 500);

  // Ban in Supabase Auth (100 years)
  await supabase.auth.admin.updateUserById(body.userId, {
    ban_duration: '876600h',
  }).catch(e => console.warn('[suspend-user] ban error:', e));

  // Revoke all active sessions
  await supabase.auth.admin.signOut(body.userId, 'global')
    .catch(e => console.warn('[suspend-user] signOut error:', e));

  return json({ success: true });
});
