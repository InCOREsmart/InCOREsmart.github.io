import { getOracleTrustLevel, type OracleTrust } from './oracleTrust';

export interface OracleTrustInput {
  confirmed: boolean;
  signatureValid?: boolean;
  duplicate?: boolean;
  stale?: boolean;
}

export function evaluateOracleTrust(input: OracleTrustInput): OracleTrust {
  return getOracleTrustLevel(input);
}
