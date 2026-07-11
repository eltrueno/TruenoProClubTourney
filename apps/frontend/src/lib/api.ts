import type { ISeries, ITeam } from '@trueno-pro-club-tourney/shared';

const API_URL = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:4000';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: 'include', // manda la cookie de sesion compartida con la raiz
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Error ${res.status} llamando a ${path}`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  getSeries: () => apiFetch<ISeries[]>('/api/series'),
  getSeriesById: (id: string) => apiFetch<ISeries>(`/api/series/${id}`),
  getMySeries: () => apiFetch<ISeries[]>('/api/series/mine'),
  getTeams: () => apiFetch<ITeam[]>('/api/teams'),

  confirmMatch: (seriesId: string, position: number) =>
    apiFetch<ISeries>(`/api/series/${seriesId}/matches/${position}/confirm`, { method: 'POST' }),
};

/** URL de la bandera de un pais a partir de su codigo ISO alpha-2 */
export function flagUrl(countryCode: string): string {
  return `https://flagcdn.com/${countryCode.toLowerCase()}.svg`;
}

/** Escudo/bandera del equipo: usa logoUrl si es un club, o la bandera si es una selección */
export function teamBadge(team: Pick<ITeam, 'logoUrl' | 'countryCode'> | undefined): string | null {
  if (!team) return null;
  if (team.logoUrl) return team.logoUrl;
  if (team.countryCode) return flagUrl(team.countryCode);
  return null;
}
