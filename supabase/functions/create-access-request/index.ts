import { handleCors, json, error } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/supabase.ts';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Simple in-memory rate limit: max 5 requests per IP per 10 minutes
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 10 * 60 * 1000 });
    return true;
  }
  if (entry.count >= 5) return false;
  entry.count++;
  return true;
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') return error('Method not allowed', 405);

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!checkRateLimit(ip)) return error('Too many requests — please wait a minute', 429);

  let body: { full_name?: string; email?: string };
  try { body = await req.json(); }
  catch { return error('Invalid JSON body', 400); }

  const { full_name, email } = body;

  if (!full_name?.trim() || full_name.trim().length > 100) {
    return error('Full name is required (max 100 characters)', 400);
  }
  if (!email?.trim() || !EMAIL_RE.test(email.trim()) || email.length > 254) {
    return error('Valid email address is required', 400);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const supabase = getServiceClient();

  // Check for existing access_request with this email
  const { data: existing } = await supabase
    .from('access_requests')
    .select('id, status')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (existing) {
    return error('An account with this email is already registered or pending approval', 409);
  }

  // Check for existing profile (already approved user)
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (profile) {
    return error('An account with this email already exists', 409);
  }

  // Insert access request
  const { error: insertError } = await supabase
    .from('access_requests')
    .insert({ full_name: full_name.trim(), email: normalizedEmail, status: 'pending' });

  if (insertError) {
    console.error('[create-access-request] insert error:', insertError);
    return error('Failed to create request — please try again', 500);
  }

  return json({ success: true, message: 'Access request submitted' }, 201);
});
