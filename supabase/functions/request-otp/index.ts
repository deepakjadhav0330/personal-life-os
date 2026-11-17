import { handleCors, json, error } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') return error('Method not allowed', 405);

  let body: { email?: string };
  try { body = await req.json(); }
  catch { return error('Invalid JSON body', 400); }

  const { email } = body;
  if (!email?.trim()) return error('Email is required', 400);

  const normalizedEmail = email.trim().toLowerCase();
  const supabase    = getServiceClient();
  const adminEmail  = Deno.env.get('ADMIN_EMAIL')?.toLowerCase().trim();
  const isAdmin     = !!adminEmail && normalizedEmail === adminEmail;

  if (isAdmin) {
    // Admin path — ensure the admin user and profile exist
    const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const existing = users.find(u => u.email === normalizedEmail);

    if (!existing) {
      // First-ever admin sign-in — create auth user
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email: normalizedEmail,
        email_confirm: true,
        app_metadata: { role: 'admin' },
        user_metadata: { full_name: 'Administrator' },
      });
      if (createErr) {
        console.error('[request-otp] admin create error:', createErr);
        return error(`Could not create admin account: ${createErr.message}`, 500);
      }
      if (created?.user) {
        await supabase.from('profiles').upsert({
          id: created.user.id,
          full_name: 'Administrator',
          email: normalizedEmail,
          status: 'approved',
          approved_at: new Date().toISOString(),
          has_seen_disclosure: true,
        }, { onConflict: 'id' });
      }
    } else {
      // Ensure admin role and profile are set
      if (existing.app_metadata?.role !== 'admin') {
        await supabase.auth.admin.updateUserById(existing.id, {
          app_metadata: { role: 'admin' },
        });
      }
      await supabase.from('profiles').upsert({
        id: existing.id,
        full_name: existing.user_metadata?.full_name ?? 'Administrator',
        email: normalizedEmail,
        status: 'approved',
        approved_at: existing.created_at,
        has_seen_disclosure: true,
      }, { onConflict: 'id' });
    }
  } else {
    // Regular user path — must have an approved profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('status')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (!profile)                       return error('No account found for this email', 404);
    if (profile.status === 'suspended') return error('Account is suspended', 423);
    if (profile.status === 'pending')   return error('Account is not yet approved', 403);
  }

  // Send magic link via service role (reliable, uses project Site URL for redirect)
  const { error: linkError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: normalizedEmail,
  });

  if (linkError) {
    console.error('[request-otp] generateLink error:', linkError);
    return error(`Failed to send sign-in link: ${linkError.message}`, 500);
  }

  return json({ success: true });
});
