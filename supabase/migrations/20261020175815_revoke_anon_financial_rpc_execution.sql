REVOKE EXECUTE ON FUNCTION public.fund_contract_escrow(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.pay_unlocked_contract_stream(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.verify_contract_outcome_and_unlock_stream(uuid, jsonb) FROM anon;
