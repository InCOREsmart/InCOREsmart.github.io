export type OracleTrustLevel = 'trusted' | 'verified' | 'warning' | 'untrusted';

export interface OracleTrust { level: OracleTrustLevel; labelKey: `oracleTrust.${OracleTrustLevel}`; }

export function getOracleTrustLevel(input: { confirmed: boolean; signatureValid?: boolean; duplicate?: boolean; stale?: boolean }): OracleTrust {
  if (input.duplicate || input.stale) return { level: 'warning', labelKey: 'oracleTrust.warning' };
  if (!input.confirmed || input.signatureValid === false) return { level: 'untrusted', labelKey: 'oracleTrust.untrusted' };
  if (input.signatureValid === true) return { level: 'trusted', labelKey: 'oracleTrust.trusted' };
  return { level: 'verified', labelKey: 'oracleTrust.verified' };
}
