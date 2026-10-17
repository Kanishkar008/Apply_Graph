import { API_BASE_URL, ApiError } from './api';
import {
  JobDetail,
  JobListResponse,
  ParsedJobData,
  ParsedJobResponse,
} from '../types/job';

/**
 * Service for interacting with Job Description API endpoints.
 */
export async function fetchJobs(
  page: number = 1,
  pageSize: number = 10,
  signal?: AbortSignal
): Promise<JobListResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
  });

  const response = await fetch(`${API_BASE_URL}/api/v1/jobs?${params.toString()}`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
    signal,
  });

  if (!response.ok) {
    let detail = `Failed to list jobs (${response.status})`;
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

export async function fetchJobById(id: string, signal?: AbortSignal): Promise<JobDetail> {
  const response = await fetch(`${API_BASE_URL}/api/v1/jobs/${id}`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
    signal,
  });

  if (!response.ok) {
    let detail = `Failed to retrieve job description (${response.status})`;
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

export async function createJobFromText(
  rawText: string,
  title?: string,
  company?: string,
  location?: string
): Promise<JobDetail> {
  const payload: Record<string, string> = { raw_text: rawText };
  if (title) payload.title = title;
  if (company) payload.company = company;
  if (location) payload.location = location;

  const response = await fetch(`${API_BASE_URL}/api/v1/jobs`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let detail = `Failed to create job (${response.status})`;
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

export async function uploadJobFile(
  file: File,
  title?: string,
  company?: string,
  location?: string
): Promise<JobDetail> {
  const formData = new FormData();
  formData.append('file', file);
  if (title) formData.append('title', title);
  if (company) formData.append('company', company);
  if (location) formData.append('location', location);

  const response = await fetch(`${API_BASE_URL}/api/v1/jobs`, {
    method: 'POST',
    headers: { 'Accept': 'application/json' },
    body: formData,
  });

  if (!response.ok) {
    let detail = `Failed to upload job file (${response.status})`;
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

export async function deleteJobById(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/jobs/${id}`, {
    method: 'DELETE',
    headers: { 'Accept': 'application/json' },
  });

  if (!response.ok && response.status !== 204) {
    let detail = `Failed to delete job (${response.status})`;
    try {
      const errJson = await response.json();
      if (errJson.detail) detail = errJson.detail;
    } catch {
      // ignore
    }
    throw new ApiError(detail, response.status);
  }
}

export async function parseJob(
  id: string,
  force: boolean = false,
  overwriteUserCorrections: boolean = false
): Promise<ParsedJobResponse> {
  const query = new URLSearchParams();
  if (force) query.set('force', 'true');
  if (overwriteUserCorrections) query.set('overwrite_user_corrections', 'true');

  const url = `${API_BASE_URL}/api/v1/jobs/${id}/parse${query.toString() ? `?${query.toString()}` : ''}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Accept': 'application/json' },
  });

  if (!response.ok) {
    let detail = `Failed to parse job (${response.status})`;
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

export async function fetchParsedJob(id: string): Promise<ParsedJobResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/jobs/${id}/parsed`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });

  if (!response.ok) {
    let detail = `Failed to fetch structured job intelligence (${response.status})`;
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

export async function updateParsedJob(
  id: string,
  parsedData: ParsedJobData
): Promise<ParsedJobResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/jobs/${id}/parsed`, {
    method: 'PUT',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ parsed_data: parsedData }),
  });

  if (!response.ok) {
    let detail = `Failed to update job intelligence (${response.status})`;
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
