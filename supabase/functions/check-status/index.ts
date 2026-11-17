import { handleCors, json, error } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const url = new URL(req.url);
  const email = (url.searchParams.get('email') ?? req.headers.get('x-email') ?? '').toLowerCase().trim();

  if (!email) return error('email query parameter is required', 400);

  const supabase = getServiceClient();

  // Check access_requests first
  const { data: request } = await supabase
    .from('access_requests')
    .select('status')
    .eq('email', email)
    .maybeSingle();

  if (request) {
    return json({ status: request.status });
  }

  // Check profiles (might have been approved and profile created)
  const { data: profile } = await supabase
    .from('profiles')
    .select('status')
    .eq('email', email)
    .maybeSingle();

  if (profile) {
    return json({ status: profile.status });
  }

  return json({ status: 'not_found' });
});
