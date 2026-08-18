-- Restrict SECURITY DEFINER functions exposed through the public Data API.
-- Trigger/event functions must not be callable as RPC by anon/authenticated.

REVOKE EXECUTE ON FUNCTION public.auto_close_expired_contracts() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;

-- Internal market recalculation is application/server work, never anonymous RPC.
REVOKE EXECUTE ON FUNCTION public.recalc_hh_market_insurance_agent() FROM PUBLIC, anon;

-- Role/company authorization helpers are only meaningful for authenticated users.
REVOKE EXECUTE ON FUNCTION public.incore_user_owns_company(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_access_contract(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_agent_owner(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_ceo() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_company_owner(uuid) FROM PUBLIC, anon;

-- Role decomposition persistence requires a signed-in user; anonymous callers must not be able to invoke a SECURITY DEFINER writer.
REVOKE EXECUTE ON FUNCTION public.save_role_decomposition(text, text, text, text, text, text, jsonb, jsonb) FROM PUBLIC, anon;

-- Remove mutable search_path from the remaining SECURITY DEFINER maintenance function.
ALTER FUNCTION public.auto_close_expired_contracts() SET search_path = public;
