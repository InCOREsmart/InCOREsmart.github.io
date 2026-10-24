import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return response({ error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return response({ error: "authentication_required" }, 401);

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) {
    return response({ error: "server_configuration_error" }, 500);
  }

  const userClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser(token);
  if (authError || !authData.user) return response({ error: "invalid_session" }, 401);

  let body: { deal_id?: string; action?: string; note?: string };
  try {
    body = await req.json();
  } catch {
    return response({ error: "invalid_json" }, 400);
  }

  const dealId = String(body.deal_id || "");
  const action = String(body.action || "");
  const allowedActions = new Set([
    "accept_terms", "start", "submit", "accept_result", "dispute", "cancel",
  ]);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(dealId)) {
    return response({ error: "invalid_deal_id" }, 400);
  }
  if (!allowedActions.has(action)) return response({ error: "invalid_action" }, 400);

  const serviceClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 2000) : "";
  const payload = note ? { note } : {};
  const { data, error } = await serviceClient.rpc("inc_app_transition_deal", {
    p_deal_id: dealId,
    p_actor_id: authData.user.id,
    p_action: action,
    p_payload: payload,
  });

  if (error) {
    const msg = String(error.message || "");
    if (msg.includes("deal_not_found")) return response({ error: "deal_not_found" }, 404);
    if (msg.includes("not_a_deal_party") || msg.includes("only_")) {
      return response({ error: "transition_not_allowed" }, 403);
    }
    return response({ error: "transition_rejected" }, 409);
  }

  const deal = Array.isArray(data) ? data[0] : data;
  if (!deal) return response({ error: "transition_failed" }, 500);
  return response({
    id: deal.id,
    status: deal.status,
    employer_terms_accepted_at: deal.employer_terms_accepted_at,
    candidate_terms_accepted_at: deal.candidate_terms_accepted_at,
    terms_agreed_at: deal.terms_agreed_at,
    started_at: deal.started_at,
    submitted_at: deal.submitted_at,
    accepted_at: deal.accepted_at,
  });
});
