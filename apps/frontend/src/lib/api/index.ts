import { seriesApi } from './series';
import { teamsApi } from './teams';
import { settingsApi } from './settings';
import { playerStatsApi } from './playerStats';

/**
 * Cliente de la API del torneo, organizado por dominio en vez de un cajón
 * desastre de funciones sueltas:
 *
 *   api.series.getAll() / api.series.getMine() / api.series.admin.resolveDispute(...)
 *   api.teams.getById(id) / api.teams.setEaClubId(...) / api.teams.admin.create(...)
 *   api.settings.get() / api.settings.admin.update(...)
 *
 * Cada dominio vive en su propio archivo (series.ts, teams.ts, settings.ts),
 * todos comparten el mismo cliente fetch tipado (client.ts).
 */
export const api = {
  series: seriesApi,
  teams: teamsApi,
  settings: settingsApi,
  playerStats: playerStatsApi,
};

export { ApiError } from './client';
export { flagUrl, teamBadge, eaCrestUrl } from './visuals';
export type * from './types';
