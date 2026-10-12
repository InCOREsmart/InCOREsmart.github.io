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

async function token() {
  const r = await db("hh_oauth_tokens?provider=eq.hh&select=*&order=updated_at.desc&limit=1");
  const a = await r.json();
  if (!r.ok || !a[0]) throw Error("HH is not connected");
  let t = a[0];
  if (t.expires_at && new Date(t.expires_at).getTime() - Date.now() < 120000 && t.refresh_token) {
    const rr = await fetch(HH_TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", "User-Agent": UA },
      body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: t.refresh_token, client_id: CID!, client_secret: SECRET! }),
    });
    const n = await rr.json();
    if (!rr.ok) throw Error(`HH token refresh failed: ${JSON.stringify(n)}`);
    const row = { ...n, provider: "hh", expires_at: new Date(Date.now() + n.expires_in * 1000).toISOString(), updated_at: new Date().toISOString() };
    await db("hh_oauth_tokens", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(row) });
    t = { ...t, ...row };
  }
  return t;
}

async function hh(path: string, t: any) {
  const r = await fetch(`${HH_API}${path}`, { headers: { Authorization: `Bearer ${t.access_token}`, "HH-User-Agent": UA, Accept: "application/json" } });
  const d = await r.json();
  if (!r.ok) throw Error(`HH request failed (${r.status}): ${JSON.stringify(d)}`);
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

async function syncVacancies(q: URLSearchParams) {
  const t = await token();
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

async function syncResumes(q: URLSearchParams) {
  const t = await token();
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
  if (a !== "health") {
    const owner = await authenticatedCompany(req);
    if (!owner) return out({ error: "Authentication required for a company account" }, 401);
  }
  if (a === "authorize") {
    const x = new URL(HH_AUTH); x.searchParams.set("response_type", "code"); x.searchParams.set("client_id", CID); x.searchParams.set("redirect_uri", APP); return Response.redirect(x.toString(), 302);
  }
  if (a === "exchange") {
    const code = u.searchParams.get("code");
    if (!code) return out({ error: "authorization code is required" }, 400);
    const r = await fetch(HH_TOKEN_URL, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", "User-Agent": UA }, body: new URLSearchParams({ grant_type: "authorization_code", client_id: CID, client_secret: SECRET, code, redirect_uri: APP }) });
    const t = await r.json();
    if (!r.ok) return out({ error: "HH token exchange failed", details: t }, 502);
    const row = { ...t, provider: "hh", expires_at: new Date(Date.now() + t.expires_in * 1000).toISOString(), updated_at: new Date().toISOString() };
    const s = await db("hh_oauth_tokens", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(row) });
    if (!s.ok) return out({ error: "Token save failed", details: await s.text() }, 500);
    return out({ success: true });
  }
  try {
    if (a === "sync" || a === "vacancies") return out(await syncVacancies(u.searchParams));
    if (a === "resumes") return out(await syncResumes(u.searchParams));
    return out({ service: "InCORE HH Market", status: "ready", sources: { RU: "hh.ru", AZ: "hh1.az" }, endpoints: { ru_vacancies: "?action=vacancies&text=страховой%20агент&host=hh.ru", ru_resumes: "?action=resumes&text=страховой%20агент&host=hh.ru", az_vacancies: "?action=vacancies&text=страховой%20агент&host=hh1.az", az_resumes: "?action=resumes&text=страховой%20агент&host=hh1.az" } });
  } catch (e) {
    return out({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});