REVOKE ALL PRIVILEGES ON TABLE
  public.bitrix_webhooks_log,
  public.hh_market_profiles,
  public.hh_market_regions,
  public.hh_market_skills,
  public.hh_resume_skills,
  public.hh_role_skill_market,
  public.hh_skill_aliases,
  public.hh_skill_hiring_difficulty,
  public.hh_skill_supply
FROM anon, authenticated;
