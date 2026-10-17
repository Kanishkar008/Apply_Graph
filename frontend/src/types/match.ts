import { RequirementLevel } from './job';
import { SourceSpan } from './resume';

export type SkillMatchStatus =
  | 'exact_match'
  | 'related_skill'
  | 'missing_evidence'
  | 'unmet_requirement'
  | 'ambiguous_requirement';

export interface MatchedSkillItem {
  skill_name: string;
  category?: string | null;
  requirement_level: RequirementLevel;
  status: SkillMatchStatus;
  years_required?: number | null;
  job_source?: SourceSpan | null;
  resume_source?: SourceSpan | null;
  explanation: string;
}

export interface MissingSkillItem {
  skill_name: string;
  category?: string | null;
  requirement_level: RequirementLevel;
  status: SkillMatchStatus;
  years_required?: number | null;
  job_source?: SourceSpan | null;
  explanation: string;
}

export interface ExperienceComparison {
  required_years?: number | null;
  candidate_years?: number | null;
  status: 'met' | 'partial' | 'unmet' | 'insufficient_evidence' | 'not_specified' | string;
  explanation: string;
  job_source?: SourceSpan | null;
}

export interface EducationComparison {
  required_level?: string | null;
  candidate_level?: string | null;
  status: 'met' | 'partial' | 'unmet' | 'insufficient_evidence' | 'not_specified' | string;
  explanation: string;
  job_source?: SourceSpan | null;
}

export interface ScoreBreakdown {
  required_skills_score: number;
  required_skills_weight: number;
  preferred_skills_score: number;
  preferred_skills_weight: number;
  experience_score?: number | null;
  experience_weight: number;
  education_score?: number | null;
  education_weight: number;
  evaluable_components: string[];
}

export interface MatchReportResponse {
  id: string;
  resume_id: string;
  job_id: string;
  overall_score: number;
  score_breakdown: ScoreBreakdown;
  matched_skills: MatchedSkillItem[];
  missing_skills: MissingSkillItem[];
  experience_comparison: ExperienceComparison;
  education_comparison: EducationComparison;
  is_provisional: boolean;
  provisional_reasons: string[];
  created_at: string;
  updated_at: string;
}

export interface MatchReportSummary {
  id: string;
  resume_id: string;
  job_id: string;
  overall_score: number;
  is_provisional: boolean;
  created_at: string;
}

export interface MatchReportListResponse {
  items: MatchReportSummary[];
  total: number;
  page: number;
  page_size: number;
}
