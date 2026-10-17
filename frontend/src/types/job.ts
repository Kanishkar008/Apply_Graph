import { FactOrigin, SourceSpan } from './resume';

export type RequirementLevel = 'required' | 'preferred' | 'ambiguous';

export interface JobSummary {
  id: string;
  title?: string | null;
  company?: string | null;
  location?: string | null;
  source_type: string;
  file_size: number;
  created_at: string;
  updated_at: string;
}

export interface JobDetail extends JobSummary {
  raw_text: string;
}

export interface JobListResponse {
  items: JobSummary[];
  total: number;
  page: number;
  page_size: number;
}

export interface ParsedJobSkill {
  name: string;
  category?: string | null;
  requirement_level: RequirementLevel;
  years_required?: number | null;
  origin: FactOrigin;
  source?: SourceSpan | null;
}

export interface ParsedJobExperienceRequirement {
  min_years?: number | null;
  max_years?: number | null;
  description?: string | null;
  origin: FactOrigin;
  source?: SourceSpan | null;
}

export interface ParsedJobEducationRequirement {
  degree_level?: string | null;
  field_of_study?: string | null;
  requirement_level: RequirementLevel;
  origin: FactOrigin;
  source?: SourceSpan | null;
}

export interface ParsedJobSalary {
  min_amount?: number | null;
  max_amount?: number | null;
  currency?: string | null;
  interval?: string | null;
  raw_salary_text?: string | null;
  origin: FactOrigin;
  source?: SourceSpan | null;
}

export interface ParsedJobResponsibility {
  text: string;
  origin: FactOrigin;
  source?: SourceSpan | null;
}

export interface ParsedJobData {
  title?: string | null;
  company?: string | null;
  location?: string | null;
  employment_type?: string | null;
  required_skills: ParsedJobSkill[];
  preferred_skills: ParsedJobSkill[];
  experience_requirements: ParsedJobExperienceRequirement[];
  education_requirements: ParsedJobEducationRequirement[];
  responsibilities: ParsedJobResponsibility[];
  salary?: ParsedJobSalary | null;
}

export interface ParsedJobResponse {
  id: string;
  job_id: string;
  parsed_data: ParsedJobData;
  extracted_data?: ParsedJobData | null;
  is_user_corrected: boolean;
  parse_warnings: string[];
  created_at: string;
  updated_at: string;
}
