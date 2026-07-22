import { apiFetch } from './client';
import type { ITournamentSettings } from '@trueno-proclub-tourney/shared';

export const settingsApi = {
  // Público
  get: () => apiFetch<ITournamentSettings>('/settings'),
  getConfig: () => apiFetch<import('@trueno-proclub-tourney/shared').ITournamentConfig>('/settings/config'),

  // Admin
  admin: {
    update: (patch: Partial<ITournamentSettings>) =>
      apiFetch<ITournamentSettings>('/admin/settings', { method: 'PATCH', body: patch }),
  },
};
