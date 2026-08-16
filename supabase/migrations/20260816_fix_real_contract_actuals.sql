-- Legacy real contract: accepted by the agent, but no work/sales have been performed yet.
-- Keep contractual financial values (revenue, escrow, payout, profit, ROI) unchanged.
-- Reset only fields that represent actual activity/results.

UPDATE public.contracts
SET
  actual_property_revenue = 0,
  actual_casco_revenue = 0,
  actual_dms_revenue = 0,
  actual_renewal_revenue = 0,
  actual_cross_sell_revenue = 0,
  actual_calls = 0,
  actual_meetings = 0,
  actual_proposals = 0,
  actual_clients = 0
WHERE id = '181b16a7-1c11-4d04-8f9c-dff5795e142d';

-- Intentionally do NOT change:
-- revenue, planned_revenue, escrow_amount, agent_payouts_total,
-- company_profit, platform_fee, roi_percentage, payout streams or status.
