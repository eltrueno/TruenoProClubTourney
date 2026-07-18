import type { ISeries, IMySeriesResponse, IEaCandidateMatch, IGroupStanding } from '@trueno-proclub-tourney/shared';
import { apiFetch, toQueryString } from './client';
import type { ICreateManualMatchInput, IEditMatchInput, IResolveDisputeInput, IDispute, IOperationResult } from './types';

const emptyMatchStats = { goals: 0, shots: 0, passesMade: 0, passesSuccess: 0, tacklesMade: 0, tacklesSuccess: 0, redCards: 0 };

export const seriesApi = {
  // ── Público ──────────────────────────────────────────────────────────────
  getAll: (teamId?: string) => apiFetch<ISeries[]>(`/series${toQueryString({ teamId })}`),
  getById: (id: string) => apiFetch<ISeries>(`/series/${id}`),
  getStandings: (stageId: string) => apiFetch<Record<string, IGroupStanding[]>>(`/series/standings/${stageId}`),

  // ── Capitán ──────────────────────────────────────────────────────────────
  getMine: () => apiFetch<IMySeriesResponse[]>('/series/mine'),
  getEaCandidates: (eaClubId: string) => apiFetch<IEaCandidateMatch[]>(`/series/ea/candidates${toQueryString({ eaClubId })}`),

  selectCandidate: (seriesId: string, position: number, candidate: IEaCandidateMatch) =>
    apiFetch<IMySeriesResponse>(`/series/${seriesId}/matches/${position}/select-candidate`, {
      method: 'POST',
      body: candidate,
    }),

  createManualMatch: (seriesId: string, position: number, input: ICreateManualMatchInput) =>
    apiFetch<IMySeriesResponse>(`/series/${seriesId}/matches/${position}/manual`, {
      method: 'POST',
      body: {
        teamA: { ...input.teamA, stats: emptyMatchStats, players: [] },
        teamB: { ...input.teamB, stats: emptyMatchStats, players: [] },
      },
    }),

  confirmMatch: (seriesId: string, position: number) =>
    apiFetch<IMySeriesResponse>(`/series/${seriesId}/matches/${position}/confirm`, { method: 'POST' }),

  unselectMatch: (seriesId: string, position: number) =>
    apiFetch<IMySeriesResponse>(`/series/${seriesId}/matches/${position}/unselect`, { method: 'POST' }),

  editMatch: (seriesId: string, position: number, input: IEditMatchInput) =>
    apiFetch<IMySeriesResponse>(`/series/${seriesId}/matches/${position}`, {
      method: 'PATCH',
      body: input,
    }),

  // ── Admin ────────────────────────────────────────────────────────────────
  admin: {
    listDisputes: () => apiFetch<IDispute[]>('/admin/disputes'),

    resolveDispute: (seriesId: string, position: number, input: IResolveDisputeInput) =>
      apiFetch<ISeries>(`/admin/series/${seriesId}/matches/${position}/resolve`, {
        method: 'POST',
        body: input,
      }),

    seedGroupsStage: (stageId: string) =>
      apiFetch<IOperationResult>(`/admin/stages/${stageId}/seed`, { method: 'POST' }),

    resolveStage: (stageId: string) =>
      apiFetch<IOperationResult>(`/admin/stages/${stageId}/resolve`, { method: 'POST' }),
  },
};
