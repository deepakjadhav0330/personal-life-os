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

  const { error: signOutError } = await supabase.auth.admin.signOut(body.userId, 'global');

  if (signOutError) {
    console.error('[revoke-sessions] error:', signOutError);
    return error('Failed to revoke sessions', 500);
  }

  return json({ success: true });
});
