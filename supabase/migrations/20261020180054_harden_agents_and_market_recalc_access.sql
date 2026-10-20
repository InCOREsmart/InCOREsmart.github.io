REVOKE ALL PRIVILEGES ON TABLE public.agents FROM anon;
REVOKE DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.agents FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.recalc_hh_market_insurance_agent() FROM authenticated;
