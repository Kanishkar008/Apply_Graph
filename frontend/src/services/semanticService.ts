import { API_BASE_URL, ApiError } from './api';
import {
  SemanticEvidenceRequest,
  SemanticEvidenceResponse,
} from '../types/semantic';

/**
 * Service for semantic evidence retrieval using local all-MiniLM-L6-v2 embeddings.
 */
export async function fetchSemanticEvidence(
  matchId: string,
  request: SemanticEvidenceRequest,
  signal?: AbortSignal
): Promise<SemanticEvidenceResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/matches/${matchId}/semantic-evidence`,
    {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      signal,
    }
  );

  if (!response.ok) {
    let detail = `Failed to retrieve semantic evidence (${response.status})`;
    try {
      const errJson = await response.json();
      if (errJson.detail) {
        detail =
          typeof errJson.detail === 'string'
            ? errJson.detail
            : JSON.stringify(errJson.detail);
      }
    } catch {
      // ignore
    }
    throw new ApiError(detail, response.status);
  }

  return response.json();
}
