interface CacheEntry { name: string | undefined; expiresAt: number; }

const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

/** ROOT_AUTH_URL viene con sufijo /api/auth (ej: https://auth.dominio.com/api/auth). Le quitamos ese sufijo para pegarle a otras rutas del mismo server. */
function getRootApiBase(): string {
  const rootAuthUrl = process.env.ROOT_AUTH_URL;
  if (!rootAuthUrl) throw new Error('Falta ROOT_AUTH_URL en las variables de entorno');
  return rootAuthUrl.replace(/\/api\/auth\/?$/, '');
}

/**
 * Resuelve el nombre publico de un usuario (capitan) contra el endpoint
 * publico /api/public/users del auth server. Cachea en memoria por unos
 * minutos para no golpear el auth server en cada listado de equipos.
 */
export async function getPublicUserName(userId: string): Promise<string | undefined> {
  const cached = cache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached.name;

  const base = getRootApiBase();
  const res = await fetch(`${base}/api/public/users?ids=${encodeURIComponent(userId)}`);

  let name: string | undefined;
  if (res.ok) {
    const body = (await res.json()) as { status: string; data?: { id: string; name: string }[] };
    name = body.data?.[0]?.name;
  } else {
    console.warn(`[authUser.service] No se pudo resolver el nombre del usuario ${userId}: HTTP ${res.status}`);
  }

  cache.set(userId, { name, expiresAt: Date.now() + CACHE_TTL_MS });
  return name;
}
