export interface DatabaseHealth {
  connected: boolean;
  details?: string | null;
}

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  environment: string;
  timestamp: string;
  database: DatabaseHealth;
}

export type HealthStatusState = 'loading' | 'success' | 'error';
