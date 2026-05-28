const BASE_URL = (import.meta as unknown as { env: { VITE_API_URL?: string } }).env.VITE_API_URL ?? 'http://localhost:1080';

export interface ListResponse {
  items: Record<string, unknown>[];
  total: number;
  limit: number;
  offset: number;
  hasNext: boolean;
}

export interface ListParams {
  limit?: number;
  offset?: number;
  [key: string]: string | number | undefined;
}

export interface GenericApi {
  list(params?: ListParams): Promise<ListResponse>;
  get(id: string): Promise<Record<string, unknown>>;
  create(body: Record<string, unknown>): Promise<Record<string, unknown>>;
  update(id: string, body: Record<string, unknown>): Promise<Record<string, unknown>>;
  remove(id: string): Promise<void>;
}

// Module-level default headers injected on every request.
// DemoContext calls setDefaultHeader('X-Caller-Id', userId) when the active
// user changes so all API calls are scoped to the right caller.
const _defaultHeaders: Record<string, string> = {};

export function setDefaultHeader(key: string, value: string | null) {
  if (value === null) delete _defaultHeaders[key];
  else _defaultHeaders[key] = value;
}

export async function apiRequest(url: string, options?: RequestInit): Promise<unknown> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ..._defaultHeaders,
      ...(options?.headers as Record<string, string> | undefined),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const msg = (body as { message?: string })?.message ?? `HTTP ${res.status}`;
    const details = (body as { details?: { field?: string; message?: string }[] })?.details;
    const detailStr = details?.map((d) => `${d.field ?? '?'}: ${d.message}`).join('; ');
    throw new Error(detailStr ? `${msg} — ${detailStr}` : msg);
  }
  if (res.status === 204) return undefined;
  return res.json();
}

export function genericApi(basePath: string): GenericApi {
  const url = `${BASE_URL}${basePath}`;
  return {
    list: (params) => {
      const qs = new URLSearchParams();
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          if (v != null) qs.set(k, String(v));
        }
      }
      const query = qs.toString();
      return apiRequest(query ? `${url}?${query}` : url) as Promise<ListResponse>;
    },
    get: (id) => apiRequest(`${url}/${id}`) as Promise<Record<string, unknown>>,
    create: (body) => apiRequest(url, { method: 'POST', body: JSON.stringify(body) }) as Promise<Record<string, unknown>>,
    update: (id, body) => apiRequest(`${url}/${id}`, { method: 'PATCH', body: JSON.stringify(body) }) as Promise<Record<string, unknown>>,
    remove: (id) => apiRequest(`${url}/${id}`, { method: 'DELETE' }) as Promise<void>,
  };
}
