-- New contracts are created with a financial plan, not realized sales.
-- The current creation flow does not have a mechanism for entering sales at creation time,
-- so actual revenue fields must start at zero. Demo contracts are generated in TypeScript
-- and are not stored in this table.

CREATE OR REPLACE FUNCTION public.reset_new_contract_actuals()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.actual_property_revenue := 0;
  NEW.actual_casco_revenue := 0;
  NEW.actual_dms_revenue := 0;
  NEW.actual_renewal_revenue := 0;
  NEW.actual_cross_sell_revenue := 0;
  NEW.actual_calls := COALESCE(NEW.actual_calls, 0);
  NEW.actual_meetings := COALESCE(NEW.actual_meetings, 0);
  NEW.actual_proposals := COALESCE(NEW.actual_proposals, 0);
  NEW.actual_clients := COALESCE(NEW.actual_clients, 0);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contracts_reset_actuals_on_insert ON public.contracts;

CREATE TRIGGER trg_contracts_reset_actuals_on_insert
BEFORE INSERT ON public.contracts
FOR EACH ROW
EXECUTE FUNCTION public.reset_new_contract_actuals();
