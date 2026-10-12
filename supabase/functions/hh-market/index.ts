import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const HH_TOKEN_URL = "https://api.hh.ru/token";
const HH_API = "https://api.hh.ru";
const HH_AUTH = "https://hh.ru/oauth/authorize";
const APP = "https://incoresmart.github.io";
const SUPA = Deno.env.get("SUPABASE_URL")!;
const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const UA = Deno.env.get("HH_USER_AGENT") || "InCOREsmart/1.0 (https://incoresmart.github.io)";
const CID = Deno.env.get("HH_CLIENT_ID");
const SECRET = Deno.env.get("HH_CLIENT_SECRET");

const H = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": APP,
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "GET, POST, OPTIONS",
};
const out = (x: unknown, s = 200) => new Response(JSON.stringify(x), { status: s, headers: H });

async function db(path: string, init: RequestInit = {}) {
  return fetch(`${SUPA}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });
}

async function authenticatedCompany(req: Request): Promise<{ id: string; companyId: string } | null> {
  const bearer = req.headers.get("authorization") || "";
  if (!/^Bearer\s+\S+$/i.test(bearer)) return null;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!anonKey) {
    console.error("SUPABASE_ANON_KEY is not configured for auth validation");
    return null;
  }
  const userResponse = await fetch(`${SUPA}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: bearer },
  });
  if (!userResponse.ok) return null;
  const user = await userResponse.json();
  if (!user?.id) return null;
  const companyResponse = await db(`companies?user_id=eq.${encodeURIComponent(user.id)}&select=id&limit=1`);
  if (!companyResponse.ok) return null;
  const companies = await companyResponse.json();
  if (!Array.isArray(companies) || !companies[0]?.id) return null;
  return { id: user.id, companyId: companies[0].id };
}

type CompanyOwner = { id: string; companyId: string };

async function token(owner: CompanyOwner) {
  const connectionPath = `hh_oauth_connections?provider=eq.hh&company_id=eq.${encodeURIComponent(owner.companyId)}&user_id=eq.${encodeURIComponent(owner.id)}&select=*&limit=1`;
  const r = await db(connectionPath);
  const rows = await r.json();
  if (!r.ok || !Array.isArray(rows) || !rows[0]) throw Error("HH is not connected for this company");
  let t = rows[0];
  const expiresSoon = t.expires_at && new Date(t.expires_at).getTime() - Date.now() < 120000;
  if (expiresSoon && !t.refresh_token) throw Error("HH connection expired. Reconnect HH.ru for this company.");
  if (expiresSoon && t.refresh_token) {
    const rr = await fetch(HH_TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", "User-Agent": UA },
      body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: t.refresh_token, client_id: CID!, client_secret: SECRET! }),
    });
    const n = await rr.json();
    if (!rr.ok || !n.access_token) throw Error("HH token refresh failed");
    const row = {
      access_token: n.access_token,
      refresh_token: n.refresh_token || t.refresh_token,
      expires_at: new Date(Date.now() + Number(n.expires_in || 0) * 1000).toISOString(),
      token_type: n.token_type || t.token_type || null,
      scope: n.scope || t.scope || null,
      updated_at: new Date().toISOString(),
    };
    const saved = await db(`hh_oauth_connections?company_id=eq.${encodeURIComponent(owner.companyId)}&provider=eq.hh&user_id=eq.${encodeURIComponent(owner.id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(row),
    });
    if (!saved.ok) throw Error("Could not save refreshed HH connection");
    t = { ...t, ...row };
  }
  return t;
}

async function hh(path: string, t: any) {
  const r = await fetch(`${HH_API}${path}`, { headers: { Authorization: `Bearer ${t.access_token}`, "HH-User-Agent": UA, Accept: "application/json" } });
  const d = await r.json();
  if (!r.ok) throw Error(`HH request failed (${r.status})`);
  return d;
}

function sourceConfig(q: URLSearchParams) {
  const host = q.get("host") || "hh.ru";
  const isAz = host === "hh1.az";
  return { host, country: isAz ? "AZ" : "RU", roleKey: q.get("role_key") || "insurance_agent", text: q.get("text") || "страховой агент", area: q.get("area") || "", idPrefix: isAz ? "hh1.az:" : "" };
}

function searchQuery(config: ReturnType<typeof sourceConfig>, page: number, resumes = false) {
  const params = new URLSearchParams({ text: config.text, page: String(page), per_page: "100", host: config.host });
  if (config.area) params.set("area", config.area);
  if (resumes) params.set("period", "30");
  return params;
}

async function syncVacancies(q: URLSearchParams, owner: CompanyOwner) {
  const t = await token(owner);
  const config = sourceConfig(q);
  const first = await hh(`/vacancies?${searchQuery(config, 0).toString()}`, t);
  const pages = Math.min(Number(first.pages || 1), 20);
  const items = [...(first.items || [])];
  for (let p = 1; p < pages; p++) {
    const d = await hh(`/vacancies?${searchQuery(config, p).toString()}`, t);
    items.push(...(d.items || []));
  }
  let detailed = 0;
  for (let i = 0; i < items.length; i += 20) {
    await Promise.all(items.slice(i, i + 20).map(async (x: any) => {
      try { x.__detail = await hh(`/vacancies/${x.id}?host=${encodeURIComponent(config.host)}`, t); detailed++; } catch {}
    }));
  }
  const now = new Date().toISOString();
  const rows = items.map((x: any) => {
    const d = x.__detail || x;
    return {
      id: `${config.idPrefix}${String(x.id)}`,
      name: x.name ?? d.name ?? null,
      employer_name: x.employer?.name ?? d.employer?.name ?? null,
      area_name: x.area?.name ?? d.area?.name ?? null,
      salary_from: x.salary?.from ?? d.salary?.from ?? null,
      salary_to: x.salary?.to ?? d.salary?.to ?? null,
      salary_currency: x.salary?.currency ?? d.salary?.currency ?? null,
      published_at: x.published_at ?? d.published_at ?? null,
      alternate_url: x.alternate_url ?? d.alternate_url ?? null,
      experience: x.experience?.name ?? d.experience?.name ?? null,
      employment: x.employment?.name ?? d.employment?.name ?? null,
      schedule: x.schedule?.name ?? d.schedule?.name ?? null,
      description: d.description ?? null,
      key_skills: d.key_skills ?? [],
      role_key: config.roleKey,
      country: config.country,
      raw_data: d,
      fetched_at: now,
    };
  });
  for (let i = 0; i < rows.length; i += 100) {
    const r = await db("hh_vacancies?on_conflict=id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(rows.slice(i, i + 100)) });
    if (!r.ok) throw Error(`Save vacancies failed: ${await r.text()}`);
  }
  return { ok: true, kind: "vacancies", role_key: config.roleKey, country: config.country, host: config.host, found: first.found ?? items.length, saved: rows.length, pages, detailed_fetched: detailed, message: `Сохранены полные карточки вакансий HH (${config.country}, ${config.host}) с описаниями и навыками.` };
}

async function syncResumes(q: URLSearchParams, owner: CompanyOwner) {
  const t = await token(owner);
  const config = sourceConfig(q);
  const first = await hh(`/resumes?${searchQuery(config, 0, true).toString()}`, t);
  const pages = Math.min(Number(first.pages || 1), 10);
  const items = [...(first.items || [])];
  for (let p = 1; p < pages; p++) {
    const d = await hh(`/resumes?${searchQuery(config, p, true).toString()}`, t);
    items.push(...(d.items || []));
  }
  const now = new Date().toISOString();
  const rows = items.map((x: any) => ({
    hh_id: `${config.idPrefix}${String(x.id)}`,
    title: x.title ?? null,
    area_name: x.area?.name ?? null,
    salary: x.salary?.amount ?? null,
    salary_currency: x.salary?.currency ?? null,
    experience: x.total_experience?.months != null ? `${x.total_experience.months} months` : null,
    employment: x.employment?.name ?? null,
    schedule: x.schedule?.name ?? null,
    published_at: x.updated_at ?? null,
    url: x.alternate_url ?? null,
    raw: x,
    country: config.country,
    host: config.host,
    role_key: config.roleKey,
    created_at: now,
  }));
  for (let i = 0; i < rows.length; i += 100) {
    const r = await db("hh_market_resumes?on_conflict=hh_id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(rows.slice(i, i + 100)) });
    if (!r.ok) throw Error(`Save resumes failed: ${await r.text()}`);
  }
  return { ok: true, kind: "resumes", role_key: config.roleKey, country: config.country, host: config.host, found: first.found ?? items.length, saved: rows.length, pages, period_days: 30, message: `Сохранены резюме HH (${config.country}, ${config.host}) за последние 30 дней.` };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: H });
  const u = new URL(req.url);
  const a = u.searchParams.get("action");
  if (!CID || !SECRET) return out({ error: "HH OAuth secrets are not configured" }, 500);
  let owner: CompanyOwner | null = null;
  if (a !== "health") {
    owner = await authenticatedCompany(req);
    if (!owner) return out({ error: "Authentication required for a company account" }, 401);
  }
  if (a === "authorize") {
    const state = crypto.randomUUID() + crypto.randomUUID().replaceAll("-", "");
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(state));
    const stateHash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
    const saved = await db("hh_oauth_states", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ state_hash: stateHash, user_id: owner!.id, company_id: owner!.companyId, expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() }),
    });
    if (!saved.ok) {
      console.error("Could not persist HH OAuth state", saved.status);
      return out({ error: "Could not start secure HH authorization" }, 500);
    }
    const x = new URL(HH_AUTH);
    x.searchParams.set("response_type", "code");
    x.searchParams.set("client_id", CID);
    x.searchParams.set("redirect_uri", APP);
    x.searchParams.set("state", state);
    return out({ authorization_url: x.toString() });
  }
  if (a === "exchange") {
    const code = u.searchParams.get("code");
    const state = u.searchParams.get("state");
    if (!code || !state || state.length > 256) return out({ error: "authorization code and state are required" }, 400);
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(state));
    const stateHash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
    const now = new Date().toISOString();
    const consumed = await db(`hh_oauth_states?state_hash=eq.${stateHash}&user_id=eq.${encodeURIComponent(owner!.id)}&company_id=eq.${encodeURIComponent(owner!.companyId)}&consumed_at=is.null&expires_at=gt.${encodeURIComponent(now)}&select=id`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ consumed_at: now }),
    });
    const consumedRows = await consumed.json().catch(() => []);
    if (!consumed.ok || !Array.isArray(consumedRows) || consumedRows.length !== 1) return out({ error: "Invalid, expired, or already used OAuth state. Start HH connection again." }, 400);
    const r = await fetch(HH_TOKEN_URL, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", "User-Agent": UA }, body: new URLSearchParams({ grant_type: "authorization_code", client_id: CID, client_secret: SECRET, code, redirect_uri: APP }) });
    const t = await r.json();
    if (!r.ok || !t.access_token) {
      console.error("HH authorization-code exchange failed", r.status);
      return out({ error: "HH token exchange failed. Start the connection again." }, 502);
    }
    const row = {
      company_id: owner!.companyId,
      user_id: owner!.id,
      provider: "hh",
      access_token: t.access_token,
      refresh_token: t.refresh_token ?? null,
      expires_at: new Date(Date.now() + Number(t.expires_in || 0) * 1000).toISOString(),
      token_type: t.token_type ?? null,
      scope: t.scope ?? null,
      updated_at: new Date().toISOString(),
    };
    const s = await db("hh_oauth_connections?on_conflict=company_id,provider", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(row) });
    if (!s.ok) {
      console.error("Could not save company HH connection", s.status);
      return out({ error: "Could not save HH connection" }, 500);
    }
    return out({ success: true });
  }
  try {
    if (a === "sync" || a === "vacancies") return out(await syncVacancies(u.searchParams, owner!));
    if (a === "resumes") return out(await syncResumes(u.searchParams, owner!));
    return out({ service: "InCORE HH Market", status: "ready", sources: { RU: "hh.ru", AZ: "hh1.az" }, endpoints: { ru_vacancies: "?action=vacancies&text=страховой%20агент&host=hh.ru", ru_resumes: "?action=resumes&text=страховой%20агент&host=hh.ru", az_vacancies: "?action=vacancies&text=страховой%20агент&host=hh1.az", az_resumes: "?action=resumes&text=страховой%20агент&host=hh1.az" } });
  } catch (e) {
    return out({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});