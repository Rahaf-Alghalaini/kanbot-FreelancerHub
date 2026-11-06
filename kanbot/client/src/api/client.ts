import type { ApiErrorBody, ErrorCode } from '../types/api';
import { t } from '../i18n';
import { tokenStore } from '../lib/token';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: ErrorCode | 'NETWORK_ERROR',
    message: string,
    public details?: { path: string; message: string }[],
  ) {
    super(message);
  }
}

/** Called when a protected request returns 401 so the app can sign the user out. */
let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: (() => void) | null) => {
  onUnauthorized = fn;
};

type Opts = { method?: string; body?: unknown; query?: Record<string, string | number | undefined>; auth?: boolean };

export async function request<T>(path: string, { method = 'GET', body, query, auth = true }: Opts = {}): Promise<T> {
  const params = new URLSearchParams();
  Object.entries(query ?? {}).forEach(([k, v]) => v !== undefined && v !== '' && params.set(k, String(v)));
  const qs = params.toString() ? `?${params}` : '';
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = tokenStore.get();
  if (auth && !token) {
    onUnauthorized?.(); // token was removed (e.g. DevTools): treat as signed out
    throw new ApiError(401, 'UNAUTHORIZED', t('err.signIn'));
  }
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}${qs}`, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', t('err.network'));
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (data as ApiErrorBody | null)?.error;
    if (res.status === 401 && auth) onUnauthorized?.();
    throw new ApiError(res.status, err?.code ?? 'INTERNAL_ERROR', err?.message ?? t('err.generic'), err?.details);
  }
  return data as T;
}
