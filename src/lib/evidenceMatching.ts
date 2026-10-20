export type MatchRoleSkill = {
  skillId: string;
  weight: number;
};

export type EvidenceMatchInput = {
  skill_id: string;
  verification_status: 'pending' | 'verified' | 'rejected';
};

export type EvidenceMatchResult = {
  score: number;
  verifiedSkills: number;
  requiredSkills: number;
  pendingSkills: number;
  missingSkills: number;
  matchedSkillIds: string[];
};

/**
 * First matching version: score is the share of role-skill weight covered by
 * at least one reviewed, verified evidence record. It deliberately does not
 * treat a resume claim or a pending evidence item as a verified skill.
 */
export function calculateEvidenceMatch(
  roleSkills: MatchRoleSkill[],
  evidence: EvidenceMatchInput[],
): EvidenceMatchResult {
  const normalized = roleSkills
    .filter(skill => skill.skillId && Number.isFinite(Number(skill.weight)) && Number(skill.weight) > 0)
    .map(skill => ({ ...skill, weight: Number(skill.weight) }));
  const totalWeight = normalized.reduce((sum, skill) => sum + skill.weight, 0);
  const verified = new Set(
    evidence.filter(item => item.verification_status === 'verified').map(item => item.skill_id),
  );
  const pending = new Set(
    evidence.filter(item => item.verification_status === 'pending').map(item => item.skill_id),
  );
  const matched = normalized.filter(skill => verified.has(skill.skillId));
  const pendingRequired = normalized.filter(skill => !verified.has(skill.skillId) && pending.has(skill.skillId));
  const missing = normalized.filter(skill => !verified.has(skill.skillId) && !pending.has(skill.skillId));

  return {
    score: totalWeight > 0
      ? Math.round((matched.reduce((sum, skill) => sum + skill.weight, 0) / totalWeight) * 100)
      : 0,
    verifiedSkills: matched.length,
    requiredSkills: normalized.length,
    pendingSkills: pendingRequired.length,
    missingSkills: missing.length,
    matchedSkillIds: matched.map(skill => skill.skillId),
  };
}
