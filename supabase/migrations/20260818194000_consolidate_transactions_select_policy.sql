-- The retention hardening introduced the canonical contract-scoped transaction policy.
-- Remove the legacy equivalent policy so the same SELECT is not evaluated twice.
DROP POLICY IF EXISTS "select_own_transactions" ON public.transactions;
