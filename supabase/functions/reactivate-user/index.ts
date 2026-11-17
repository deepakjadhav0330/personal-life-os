import { handleCors, json, error } from '../_shared/cors.ts';
import { getServiceClient, validateAdmin } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') return error('Method not allowed', 405);

  const supabase = getServiceClient();
  const admin = await validateAdmin(req, supabase);
  if (!admin) return error('Forbidden', 403);

  let body: { userId: string };
  try { body = await req.json(); }
  catch { return error('Invalid JSON body', 400); }

  if (!body.userId) return error('userId is required', 400);

  // Restore profile status
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      status: 'approved',
      suspended_at: null,
      suspended_reason: null,
    })
    .eq('id', body.userId);

  if (profileError) return error('Failed to update profile', 500);

  // Unban in Supabase Auth
  await supabase.auth.admin.updateUserById(body.userId, {
    ban_duration: 'none',
  }).catch(e => console.warn('[reactivate-user] unban error:', e));

  return json({ success: true });
});
