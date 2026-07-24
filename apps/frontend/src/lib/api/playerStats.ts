import type { IPlayerAggregateStats, IPlayerProfile } from '@trueno-proclub-tourney/shared';
import { apiFetch } from './client';

export const playerStatsApi = {
  // ── Público ──────────────────────────────────────────────────────────────
  getAll: () => apiFetch<IPlayerAggregateStats[]>('/playerstats'),
  getOne: (eaPlayerId: string) => apiFetch<IPlayerProfile>(`/playerstats/${eaPlayerId}`),
};
