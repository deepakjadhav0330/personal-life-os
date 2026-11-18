import { handleCors, json, error } from '../_shared/cors.ts';
import { getServiceClient, validateAdmin } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') return error('Method not allowed', 405);

  const supabase = getServiceClient();
  const admin = await validateAdmin(req, supabase);
  if (!admin) return error('Forbidden', 403);

  let body: { userId?: string; email?: string; fullName?: string };
  try { body = await req.json(); }
  catch { return error('Invalid JSON body', 400); }

  // Get the access request
  let requestEmail = body.email;
  let fullName = body.fullName ?? 'User';

  if (!requestEmail && body.userId) {
    const { data: req_ } = await supabase
      .from('access_requests')
      .select('email, full_name')
      .eq('id', body.userId)
      .single();
    if (req_) {
      requestEmail = req_.email;
      fullName = req_.full_name;
    }
  }

  if (!requestEmail) return error('email or userId is required', 400);

  // Find the access request (also fetch requested_at for accurate registration timestamp)
  const { data: accessReq } = await supabase
    .from('access_requests')
    .select('id, full_name, email, status, requested_at')
    .eq('email', requestEmail)
    .maybeSingle();

  if (accessReq) {
    fullName = accessReq.full_name ?? fullName;
  }

  // Check if auth user already exists
  let authUserId: string | undefined;
  const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const existing = users.find(u => u.email === requestEmail);

  if (existing) {
    authUserId = existing.id;
  } else {
    // Create Supabase Auth user
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: requestEmail,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (createError || !newUser?.user) {
      console.error('[approve-user] create user error:', createError);
      return error('Failed to create user account', 500);
    }
    authUserId = newUser.user.id;
  }

  // Upsert profile — use the original request timestamp as registered_at
  const now = new Date().toISOString();
  const registeredAt = accessReq?.requested_at ?? now;
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: authUserId,
      full_name: fullName,
      email: requestEmail,
      status: 'approved',
      registered_at: registeredAt,
      approved_at: now,
    }, { onConflict: 'id' });

  if (profileError) {
    console.error('[approve-user] profile error:', profileError);
    return error('Failed to update profile', 500);
  }

  // Update access request status
  if (accessReq?.id) {
    await supabase
      .from('access_requests')
      .update({ status: 'approved', reviewed_at: now, reviewed_by: admin.id })
      .eq('id', accessReq.id);
  }

  // Send approval notification (magic link / invite email)
  await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: requestEmail,
  }).catch(e => console.warn('[approve-user] email send warning:', e));

  return json({ success: true, userId: authUserId });
});
