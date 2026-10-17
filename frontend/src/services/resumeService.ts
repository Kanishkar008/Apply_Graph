import { API_BASE_URL, ApiError } from './api';
import {
  ResumeSummary,
  ResumeDetail,
  ParsedResumeResponse,
  ParsedResumeData,
} from '../types/resume';

/**
 * Service for interacting with Resume Ingestion API endpoints.
 */
export async function fetchResumes(signal?: AbortSignal): Promise<ResumeSummary[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/resumes`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
    signal,
  });

  if (!response.ok) {
    let detail = `Failed to list resumes (${response.status})`;
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

export async function fetchResumeById(id: string, signal?: AbortSignal): Promise<ResumeDetail> {
  const response = await fetch(`${API_BASE_URL}/api/v1/resumes/${id}`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
    signal,
  });

  if (!response.ok) {
    let detail = `Failed to retrieve resume (${response.status})`;
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

export async function uploadResumeFile(file: File): Promise<ResumeDetail> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/api/v1/resumes`, {
    method: 'POST',
    headers: { 'Accept': 'application/json' },
    body: formData,
  });

  if (!response.ok) {
    let detail = `Failed to upload resume (${response.status})`;
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

export async function deleteResumeById(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/resumes/${id}`, {
    method: 'DELETE',
    headers: { 'Accept': 'application/json' },
  });

  if (!response.ok && response.status !== 204) {
    let detail = `Failed to delete resume (${response.status})`;
    try {
      const errJson = await response.json();
      if (errJson.detail) detail = errJson.detail;
    } catch {
      // ignore
    }
    throw new ApiError(detail, response.status);
  }
}

export async function parseResume(
  id: string,
  force: boolean = false,
  overwriteUserCorrections: boolean = false
): Promise<ParsedResumeResponse> {
  const query = new URLSearchParams();
  if (force) query.set('force', 'true');
  if (overwriteUserCorrections) query.set('overwrite_user_corrections', 'true');

  const url = `${API_BASE_URL}/api/v1/resumes/${id}/parse${query.toString() ? `?${query.toString()}` : ''}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Accept': 'application/json' },
  });

  if (!response.ok) {
    let detail = `Failed to parse resume (${response.status})`;
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

export async function fetchParsedResume(id: string): Promise<ParsedResumeResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/resumes/${id}/parsed`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });

  if (!response.ok) {
    let detail = `Failed to fetch structured intelligence (${response.status})`;
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

export async function updateParsedResume(
  id: string,
  parsedData: ParsedResumeData
): Promise<ParsedResumeResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/resumes/${id}/parsed`, {
    method: 'PUT',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ parsed_data: parsedData }),
  });

  if (!response.ok) {
    let detail = `Failed to update structured intelligence (${response.status})`;
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

