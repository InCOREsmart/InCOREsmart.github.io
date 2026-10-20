REVOKE EXECUTE ON FUNCTION public.get_role_market_skill_stats(text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_role_market_skill_stats(text, text, jsonb) TO authenticated;
