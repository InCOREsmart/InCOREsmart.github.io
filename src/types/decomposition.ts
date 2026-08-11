export type SkillType = 'hard' | 'soft' | 'hybrid';
export type VerificationLevel = 'L1_bio' | 'L2_simulation' | 'L3_digital_twin' | 'L4_smart_contract';
export type RelationType = 'requires' | 'related_to' | 'conflicts_with' | 'enhances';

export interface SkillDefinition {
  name: string;
  description: string;
  skill_type: SkillType;
  verification_level: VerificationLevel;
  weight: number;
  is_required: boolean;
  expected_outcomes: string[];
  verification_criteria: string[];
}

export interface SkillRelationDefinition {
  skill_from: string;
  skill_to: string;
  relation_type: RelationType;
  strength: number;
  is_directed: boolean;
}

export interface RoleDecomposition {
  role: {
    name: string;
    description: string;
    industry: string;
    category: string;
  };
  skills: SkillDefinition[];
  skills_relations: SkillRelationDefinition[];
}

export interface RoleInput {
  name: string;
  industry: string;
  actions: string[];
  expected_results: string[];
  source_document_name?: string;
  source_document_data?: string;
  source_document_type?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}
