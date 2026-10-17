export interface ResumeSummary {
  id: string;
  filename: string;
  file_type: 'pdf' | 'txt' | string;
  file_size: number;
  created_at: string;
  updated_at: string;
}

export interface ResumeDetail extends ResumeSummary {
  raw_text: string;
}

export interface SourceSpan {
  source_text: string;
  char_start?: number | null;
  char_end?: number | null;
}

export type FactOrigin = 'extracted' | 'user_added' | 'user_edited';

export interface ParsedSkill {
  name: string;
  category?: string | null;
  origin: FactOrigin;
  source?: SourceSpan | null;
}

export interface ParsedExperience {
  company?: string | null;
  role?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_current: boolean;
  location?: string | null;
  description?: string | null;
  highlights: string[];
  skills_used: string[];
  origin: FactOrigin;
  source?: SourceSpan | null;
}

export interface ParsedEducation {
  institution?: string | null;
  degree?: string | null;
  field_of_study?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  gpa?: string | null;
  origin: FactOrigin;
  source?: SourceSpan | null;
}

export interface ParsedProject {
  name: string;
  description?: string | null;
  url?: string | null;
  technologies: string[];
  origin: FactOrigin;
  source?: SourceSpan | null;
}

export interface ParsedCertification {
  name: string;
  issuer?: string | null;
  date?: string | null;
  url?: string | null;
  origin: FactOrigin;
  source?: SourceSpan | null;
}

export interface ParsedResumeData {
  candidate_name?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  summary?: string | null;
  skills: ParsedSkill[];
  work_experience: ParsedExperience[];
  education: ParsedEducation[];
  projects: ParsedProject[];
  certifications: ParsedCertification[];
}

export interface ParsedResumeResponse {
  id: string;
  resume_id: string;
  parsed_data: ParsedResumeData;
  extracted_data?: ParsedResumeData | null;
  is_user_corrected: boolean;
  parse_warnings: string[];
  created_at: string;
  updated_at: string;
}
