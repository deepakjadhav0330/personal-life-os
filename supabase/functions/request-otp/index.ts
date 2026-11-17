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
  const supabase = getServiceClient();
  const adminEmail = Deno.env.get('ADMIN_EMAIL')?.toLowerCase().trim();

  // Look up profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, status')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (!profile) {
    // Check if this is the admin email — admin can sign in even without a profile
    // (profile gets created on first successful sign-in)
    if (adminEmail && normalizedEmail === adminEmail) {
      // Allow admin to sign in — they may not have a profile yet
    } else {
      return error('No approved account found for this email', 404);
    }
  } else {
    if (profile.status === 'suspended') return error('Account is suspended', 423);
    if (profile.status === 'pending')   return error('Account is not yet approved', 403);
    // status === 'approved' — proceed

    // If this is the admin email, ensure admin role is set
    if (adminEmail && normalizedEmail === adminEmail) {
      await supabase.auth.admin.updateUserById(profile.id, {
        app_metadata: { role: 'admin' },
      });
    }
  }

  // If the admin doesn't have an auth user yet, create one first
  let userId = profile?.id;
  if (!userId && adminEmail && normalizedEmail === adminEmail) {
    // Look up by email in auth.users
    const { data: { users: authUsers } } = await supabase.auth.admin.listUsers({ perPage: 1 });
    const existing = authUsers.find(u => u.email === normalizedEmail);
    if (existing) {
      userId = existing.id;
      // Set admin role
      await supabase.auth.admin.updateUserById(userId, { app_metadata: { role: 'admin' } });
    } else {
      // Create admin user
      const { data: newUser } = await supabase.auth.admin.createUser({
        email: normalizedEmail,
        email_confirm: true,
        app_metadata: { role: 'admin' },
      });
      if (newUser?.user) {
        userId = newUser.user.id;
        // Create admin profile
        await supabase.from('profiles').insert({
          id: userId,
          full_name: 'Administrator',
          email: normalizedEmail,
          status: 'approved',
          approved_at: new Date().toISOString(),
          has_seen_disclosure: true,
        }).onConflict('id').ignore();
      }
    }
  }

  // Generate OTP link (this sends the email)
  const { error: otpError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: normalizedEmail,
  });

  if (otpError) {
    console.error('[request-otp] OTP error:', otpError);
    return error('Failed to send sign-in code — please try again', 500);
  }

  return json({ success: true });
});
