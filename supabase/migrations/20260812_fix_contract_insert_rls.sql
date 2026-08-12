-- InCORE: fix RLS for CEO contract creation
-- Allows an authenticated CEO to create a contract only for their own company.
-- Does not change any financial calculations or contract payout logic.

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "CEO can create contracts for own company" ON public.contracts;

CREATE POLICY "CEO can create contracts for own company"
ON public.contracts
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = company_id
      AND c.user_id = auth.uid()
  )
);
