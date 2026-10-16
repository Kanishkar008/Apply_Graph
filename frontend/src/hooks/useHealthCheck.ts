import { useState, useEffect, useCallback, useRef } from 'react';
import { HealthResponse, HealthStatusState } from '../types/health';
import { fetchHealthStatus, ApiError } from '../services/api';

export interface UseHealthCheckReturn {
  status: HealthStatusState;
  data: HealthResponse | null;
  error: string | null;
  latencyMs: number | null;
  lastChecked: Date | null;
  refetch: () => Promise<void>;
  isPolling: boolean;
  togglePolling: () => void;
}

export function useHealthCheck(pollIntervalMs: number = 30000): UseHealthCheckReturn {
  const [status, setStatus] = useState<HealthStatusState>('loading');
  const [data, setData] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [isPolling, setIsPolling] = useState<boolean>(true);

  const abortControllerRef = useRef<AbortController | null>(null);

  const performCheck = useCallback(async () => {
    // Abort previous inflight request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setStatus('loading');
    setError(null);
    const start = performance.now();

    try {
      const result = await fetchHealthStatus(controller.signal);
      const elapsed = Math.round(performance.now() - start);
      setLatencyMs(elapsed);
      setData(result);
      setStatus('success');
      setError(null);
      setLastChecked(new Date());
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      const elapsed = Math.round(performance.now() - start);
      setLatencyMs(elapsed);
      setStatus('error');
      const errorMsg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Unable to connect to ApplyGraph backend API.';
      setError(errorMsg);
      setLastChecked(new Date());
    }
  }, []);

  useEffect(() => {
    performCheck();

    let timer: ReturnType<typeof setInterval> | null = null;
    if (isPolling && pollIntervalMs > 0) {
      timer = setInterval(() => {
        performCheck();
      }, pollIntervalMs);
    }

    return () => {
      if (timer) clearInterval(timer);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [performCheck, isPolling, pollIntervalMs]);

  const togglePolling = useCallback(() => {
    setIsPolling((prev) => !prev);
  }, []);

  return {
    status,
    data,
    error,
    latencyMs,
    lastChecked,
    refetch: performCheck,
    isPolling,
    togglePolling,
  };
}
