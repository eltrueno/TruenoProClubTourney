import type { ISeries, ITeam } from '@trueno-proclub-tourney/shared';
import type { IEaCandidateMatch } from '@trueno-proclub-tourney/shared';

const API_URL = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    // Soporta ambos formatos: { status: { code, message } } y { error: string }
    const code = body?.status?.code ?? 'UNKNOWN_ERROR';
    const message = body?.status?.message ?? body?.error ?? `Error ${res.status}`;
    throw new ApiError(code, message);
  }

  return res.json() as Promise<T>;
}

export const api = {
  // Públicos
  getSeries: () => apiFetch<ISeries[]>('/series'),
  getSeriesById: (id: string) => apiFetch<ISeries>(`/series/${id}`),
  getTeams: () => apiFetch<ITeam[]>('/teams'),

  // Capitán
  getMySeries: () => apiFetch<import('@trueno-proclub-tourney/shared').IMySeriesResponse[]>('/series/mine'),
  getMyTeam: () => apiFetch<ITeam>('/teams/mine'),
  getEaCandidates: (eaClubId: string) =>
    apiFetch<IEaCandidateMatch[]>(`/series/ea/candidates?eaClubId=${eaClubId}`),
  selectCandidate: (seriesId: string, position: number, candidate: IEaCandidateMatch) =>
    apiFetch<ISeries>(`/series/${seriesId}/matches/${position}/select-candidate`, {
      method: 'POST',
      body: JSON.stringify(candidate),
    }),
  confirmMatch: (seriesId: string, position: number) =>
    apiFetch<ISeries>(`/series/${seriesId}/matches/${position}/confirm`, { method: 'POST' }),
  editMatch: (seriesId: string, position: number, body: { teamA: { score: number; penaltiesScore?: number | null }; teamB: { score: number; penaltiesScore?: number | null }; changeDescription: string }) =>
    apiFetch<ISeries>(`/series/${seriesId}/matches/${position}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  setEaClubId: (teamId: string, eaClubId: string) =>
    apiFetch<ITeam>(`/teams/${teamId}/ea-club`, {
      method: 'PATCH',
      body: JSON.stringify({ eaClubId }),
    }),

  // Admin: equipos
  createTeam: (body: { name: string; countryCode?: string; logoUrl?: string; group?: string }) =>
    apiFetch<ITeam>('/teams', { method: 'POST', body: JSON.stringify(body) }),
  updateTeam: (id: string, body: Partial<{ name: string; countryCode: string; logoUrl: string; group: string }>) =>
    apiFetch<ITeam>(`/teams/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  assignCaptain: (teamId: string, userId: string) =>
    apiFetch(`/teams/${teamId}/captain`, { method: 'POST', body: JSON.stringify({ userId }) }),
  removeCaptain: (teamId: string) =>
    apiFetch(`/teams/${teamId}/captain`, { method: 'DELETE' }),

  // Admin: fases y disputas
  listDisputes: () => apiFetch<any[]>('/admin/disputes'),
  resolveDispute: (seriesId: string, position: number, body: { teamA: any; teamB: any }) =>
    apiFetch<ISeries>(`/admin/series/${seriesId}/matches/${position}/resolve`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  seedGroupsStage: (stageId: string) =>
    apiFetch<{ status: { code: string; message: string } }>(`/admin/stages/${stageId}/seed`, { method: 'POST' }),
  resolveStage: (stageId: string) =>
    apiFetch<{ status: { code: string; message: string } }>(`/admin/stages/${stageId}/resolve`, { method: 'POST' }),
};

export function flagUrl(countryCode: string): string {
  return `https://flagcdn.com/${countryCode.toLowerCase()}.svg`;
}

export function teamBadge(team: Pick<ITeam, 'logoUrl' | 'countryCode'> | undefined): string | null {
  if (!team) return null;
  if (team.logoUrl) return team.logoUrl;
  if (team.countryCode) return flagUrl(team.countryCode);
  return null;
}
