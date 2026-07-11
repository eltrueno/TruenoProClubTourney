const ROOT_AUTH_URL = import.meta.env.PUBLIC_ROOT_AUTH_URL ?? 'https://midominio.com/api/auth';

export interface Session {
  user: { id: string; name?: string; image?: string };
}

/** Llama directo a la raíz (no al backend del torneo) para saber quién está logueado */
export async function getSession(): Promise<Session | null> {
  const res = await fetch(`${ROOT_AUTH_URL}/get-session`, { credentials: 'include' });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.user ? data : null;
}
