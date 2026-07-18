const API_URL = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:4000';

/** Error tipado que lanza cualquier llamada a la API: siempre tiene un `code` estable para poder hacer `switch` en el catch, ademas del `message` legible. */
export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly httpStatus: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions<TBody = unknown> {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: TBody;
}

/**
 * Fetch tipado hacia el backend del torneo. Centraliza credenciales, headers
 * y el parseo de errores para que ningun modulo de la API tenga que
 * repetir ese boilerplate.
 */
export async function apiFetch<TResponse, TBody = unknown>(path: string, options: RequestOptions<TBody> = {}): Promise<TResponse> {
  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    // Soporta ambos formatos de error que devuelve el backend: { status: { code, message } } y { error: string }
    const code = body?.status?.code ?? 'UNKNOWN_ERROR';
    const message = body?.status?.message ?? body?.error ?? `Error ${res.status}`;
    throw new ApiError(code, message, res.status);
  }

  return res.json() as Promise<TResponse>;
}

/** Construye un query string a partir de un objeto, omitiendo claves undefined/null */
export function toQueryString(params: Record<string, string | number | undefined | null>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null);
  if (entries.length === 0) return '';
  return '?' + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}
