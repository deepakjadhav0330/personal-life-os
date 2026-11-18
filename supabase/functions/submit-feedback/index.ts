import { handleCors, json, error } from '../_shared/cors.ts';
import { getServiceClient, validateUser } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') return error('Method not allowed', 405);

  const supabase = getServiceClient();
  const user     = await validateUser(req, supabase);
  if (!user) return error('Unauthorized', 401);

  // Check the user is approved (not suspended or pending)
  const { data: profile } = await supabase
    .from('profiles')
    .select('status, full_name, email')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || profile.status !== 'approved') {
    return error('Account not approved', 403);
  }

  let body: { category?: string; rating?: number | null; message?: string };
  try { body = await req.json(); }
  catch { return error('Invalid JSON body', 400); }

  const { category = 'general', rating = null, message } = body;

  // Validate
  if (!message?.trim() || message.trim().length < 5) {
    return error('Message must be at least 5 characters', 400);
  }
  if (message.trim().length > 2000) {
    return error('Message must be under 2000 characters', 400);
  }
  const validCategories = ['bug', 'suggestion', 'general', 'praise'];
  if (!validCategories.includes(category)) {
    return error('Invalid category', 400);
  }
  if (rating !== null && (typeof rating !== 'number' || rating < 1 || rating > 5)) {
    return error('Rating must be 1–5', 400);
  }

  // Insert using service role (no RLS restriction on insert)
  const { error: insertError } = await supabase
    .from('feedback')
    .insert({
      user_id:    user.id,
      user_name:  profile.full_name,
      user_email: profile.email,
      category,
      rating,
      message:    message.trim(),
    });

  if (insertError) {
    console.error('[submit-feedback] insert error:', insertError);
    return error('Failed to submit feedback', 500);
  }

  return json({ success: true });
});
