import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';

// Service-role client — only used inside Edge Functions, never in frontend
export function getServiceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

// Validate the caller is an authenticated admin
export async function validateAdmin(req: Request, supabase: ReturnType<typeof getServiceClient>) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) return null;
  if (user.app_metadata?.role !== 'admin') return null;

  return user;
}

// Validate any authenticated user (not just admin)
export async function validateUser(req: Request, supabase: ReturnType<typeof getServiceClient>) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) return null;
  return user;
}
