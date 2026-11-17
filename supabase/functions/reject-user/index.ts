import { handleCors, json, error } from '../_shared/cors.ts';
import { getServiceClient, validateAdmin } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') return error('Method not allowed', 405);

  const supabase = getServiceClient();
  const admin = await validateAdmin(req, supabase);
  if (!admin) return error('Forbidden', 403);

  let body: { userId?: string; email?: string; reason?: string };
  try { body = await req.json(); }
  catch { return error('Invalid JSON body', 400); }

  if (!body.userId && !body.email) return error('userId or email required', 400);

  const filter = body.userId
    ? supabase.from('access_requests').update({
        status: 'rejected',
        rejection_reason: body.reason ?? null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: admin.id,
      }).eq('id', body.userId)
    : supabase.from('access_requests').update({
        status: 'rejected',
        rejection_reason: body.reason ?? null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: admin.id,
      }).eq('email', body.email!);

  const { error: updateError } = await filter;

  if (updateError) return error('Failed to reject request', 500);

  return json({ success: true });
});
