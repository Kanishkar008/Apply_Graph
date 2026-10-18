import { SourceSpan } from './resume';

export type SemanticReviewState = 'unreviewed' | 'confirmed' | 'rejected' | 'uncertain';

export interface SemanticEvidenceRequest {
  requirement_text: string;
  top_k?: number;
  min_similarity?: number;
}

export interface SemanticEvidenceCandidate {
  passage_text: string;
  source_span: SourceSpan;
  similarity_score: number;
  diagnostic_flag?: string | null;
  review_state: SemanticReviewState;
}

export interface SemanticEvidenceResponse {
  match_id: string;
  resume_id: string;
  requirement_text: string;
  total_passages_evaluated: number;
  min_similarity_threshold: number;
  candidates: SemanticEvidenceCandidate[];
  methodology_note: string;
}
