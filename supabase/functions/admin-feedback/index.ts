import { handleCors, json, error } from '../_shared/cors.ts';
import { getServiceClient, validateAdmin } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const supabase = getServiceClient();
  const admin    = await validateAdmin(req, supabase);
  if (!admin) return error('Forbidden', 403);

  const url      = new URL(req.url);
  const category = url.searchParams.get('category');
  const page     = parseInt(url.searchParams.get('page') ?? '1', 10);
  const limit    = 20;
  const offset   = (page - 1) * limit;

  let query = supabase
    .from('feedback')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (category && ['bug', 'suggestion', 'general', 'praise'].includes(category)) {
    query = query.eq('category', category);
  }

  const { data, count, error: fetchError } = await query;

  if (fetchError) return error('Failed to fetch feedback', 500);

  return json({
    feedback: data ?? [],
    total:    count ?? 0,
    page,
    pages:    Math.ceil((count ?? 0) / limit),
  });
});
