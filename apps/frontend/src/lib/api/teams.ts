import type { ITeam } from '@trueno-proclub-tourney/shared';
import { apiFetch } from './client';
import type { ICreateTeamInput, IUpdateTeamInput } from './types';

export const teamsApi = {
  // ── Público ──────────────────────────────────────────────────────────────
  getAll: () => apiFetch<ITeam[]>('/teams'),
  getById: (id: string) => apiFetch<ITeam>(`/teams/${id}`),

  // ── Capitán ──────────────────────────────────────────────────────────────
  getMine: () => apiFetch<ITeam>('/teams/mine'),
  setEaClubId: (teamId: string, eaClubId: string) =>
    apiFetch<ITeam>(`/teams/${teamId}/ea-club`, { method: 'PATCH', body: { eaClubId } }),

  // ── Admin ────────────────────────────────────────────────────────────────
  admin: {
    create: (input: ICreateTeamInput) => apiFetch<ITeam>('/teams', { method: 'POST', body: input }),

    update: (id: string, input: IUpdateTeamInput) =>
      apiFetch<ITeam>(`/teams/${id}`, { method: 'PATCH', body: input }),

    assignCaptain: (teamId: string, userId: string) =>
      apiFetch<void>(`/teams/${teamId}/captain`, { method: 'POST', body: { userId } }),

    removeCaptain: (teamId: string) => apiFetch<void>(`/teams/${teamId}/captain`, { method: 'DELETE' }),
  },
};
