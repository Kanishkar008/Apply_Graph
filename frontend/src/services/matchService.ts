import { API_BASE_URL, ApiError } from './api';
import {
  MatchReportListResponse,
  MatchReportResponse,
} from '../types/match';

/**
 * Service for interacting with Explainable Match API endpoints.
 */
export async function createMatchReport(
  resumeId: string,
  jobId: string,
  force: boolean = false
): Promise<MatchReportResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/matches`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      resume_id: resumeId,
      job_id: jobId,
      force,
    }),
  });

  if (!response.ok) {
    let detail = `Failed to generate match report (${response.status})`;
    try {
      const errJson = await response.json();
      if (errJson.detail) {
        detail = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail);
      }
    } catch {
      // ignore
    }
    throw new ApiError(detail, response.status);
  }

  return response.json();
}

export async function fetchMatchReportById(id: string): Promise<MatchReportResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/matches/${id}`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });

  if (!response.ok) {
    let detail = `Failed to retrieve match report (${response.status})`;
    try {
      const errJson = await response.json();
      if (errJson.detail) detail = errJson.detail;
    } catch {
      // ignore
    }
    throw new ApiError(detail, response.status);
  }

  return response.json();
}

export async function fetchMatchReports(
  page: number = 1,
  pageSize: number = 10,
  resumeId?: string,
  jobId?: string
): Promise<MatchReportListResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
  });
  if (resumeId) params.set('resume_id', resumeId);
  if (jobId) params.set('job_id', jobId);

  const response = await fetch(`${API_BASE_URL}/api/v1/matches?${params.toString()}`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });

  if (!response.ok) {
    let detail = `Failed to list match reports (${response.status})`;
    try {
      const errJson = await response.json();
      if (errJson.detail) detail = errJson.detail;
    } catch {
      // ignore
    }
    throw new ApiError(detail, response.status);
  }

  return response.json();
}

export async function deleteMatchReport(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/matches/${id}`, {
    method: 'DELETE',
    headers: { 'Accept': 'application/json' },
  });

  if (!response.ok && response.status !== 204) {
    let detail = `Failed to delete match report (${response.status})`;
    try {
      const errJson = await response.json();
      if (errJson.detail) detail = errJson.detail;
    } catch {
      // ignore
    }
    throw new ApiError(detail, response.status);
  }
}
