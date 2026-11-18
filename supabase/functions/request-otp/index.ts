import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';
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
    // Admin path — look up user by email via profiles table first (O(1), no page-size limit),
    // then fall back to auth.admin if profile doesn't exist yet.
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    let existingUserId: string | null = adminProfile?.id ?? null;

    if (!existingUserId) {
      // No profile yet — try to find in auth.users by listing (first-ever admin sign-in only)
      // Use page-based search to avoid perPage: 1000 truncation
      let found = null;
      let page  = 1;
      while (!found) {
        const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers({ page, perPage: 50 });
        if (listErr || users.length === 0) break;
        found = users.find(u => u.email === normalizedEmail) ?? null;
        if (found) break;
        if (users.length < 50) break; // last page
        page++;
      }
      existingUserId = found?.id ?? null;
    }

    if (!existingUserId) {
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
        existingUserId = created.user.id;
        await supabase.from('profiles').upsert({
          id: existingUserId,
          full_name: 'Administrator',
          email: normalizedEmail,
          status: 'approved',
          approved_at: new Date().toISOString(),
          has_seen_disclosure: true,
        }, { onConflict: 'id' });
      }
    } else {
      // Ensure admin role and profile are set
      await supabase.auth.admin.updateUserById(existingUserId, {
        app_metadata: { role: 'admin' },
      });
      await supabase.from('profiles').upsert({
        id: existingUserId,
        full_name: 'Administrator',
        email: normalizedEmail,
        status: 'approved',
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

  // Unified: send OTP via anon client for both admin and regular users
  // This sends the configured email template (shows 6-digit code)
  const anonClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  );

  const { error: otpError } = await anonClient.auth.signInWithOtp({
    email: normalizedEmail,
    options: { shouldCreateUser: false },
  });

  if (otpError) {
    // Fallback: use generateLink if signInWithOtp fails
    console.warn('[request-otp] signInWithOtp failed, trying generateLink:', otpError.message);
    const { error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: normalizedEmail,
    });
    if (linkError) {
      console.error('[request-otp] generateLink error:', linkError);
      return error(`Failed to send sign-in code: ${linkError.message}`, 500);
    }
  }

  return json({ success: true });
});
