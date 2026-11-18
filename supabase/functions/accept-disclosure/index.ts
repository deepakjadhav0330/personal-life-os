import { handleCors, json, error } from "../_shared/cors.ts";
import { getServiceClient, validateUser } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") return error("Method not allowed", 405);

  const supabase = getServiceClient();
  const user = await validateUser(req, supabase);
  if (!user) return error("Unauthorized", 401);

  // Use service role to update — bypasses RLS (which only allows SELECT on profiles)
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ has_seen_disclosure: true })
    .eq("id", user.id);

  if (updateError) {
    console.error("[accept-disclosure] update error:", updateError);
    return error("Failed to save preference", 500);
  }

  return json({ success: true });
});
