import { HealthResponse } from '../types/health';

/**
 * Base URL for ApplyGraph backend API.
 * Configured via Vite environment variable VITE_API_BASE_URL.
 */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Fetch health status from FastAPI backend.
 */
export async function fetchHealthStatus(signal?: AbortSignal): Promise<HealthResponse> {
  const url = `${API_BASE_URL}/api/v1/health`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal,
    });

    if (!response.ok) {
      throw new ApiError(
        `Backend responded with HTTP ${response.status} (${response.statusText})`,
        response.status
      );
    }

    const data: HealthResponse = await response.json();
    return data;
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      throw err;
    }
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
    const message =
      err instanceof Error
        ? err.message
        : 'Failed to establish connection with ApplyGraph backend';
    throw new ApiError(message, undefined, err);
  }
}
