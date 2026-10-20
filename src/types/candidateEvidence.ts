export type CandidateEvidenceSourceType =
  | 'resume'
  | 'portfolio'
  | 'work_sample'
  | 'reference'
  | 'certificate'
  | 'other';

export type CandidateEvidenceVerificationStatus =
  | 'pending'
  | 'verified'
  | 'rejected';

export interface CandidateSkillEvidence {
  id: string;
  candidate_id: string;
  skill_id: string;
  source_type: CandidateEvidenceSourceType;
  source_uri: string | null;
  evidence_text: string | null;
  evidence_metadata: Record<string, unknown>;
  verification_status: CandidateEvidenceVerificationStatus;
  verified_by: string | null;
  verified_at: string | null;
  created_by: string;
  created_at: string;
}
