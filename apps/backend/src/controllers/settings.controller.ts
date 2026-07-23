import type { Request, Response } from 'express';
import * as settingsService from '../services/settings.service.js';

import { loadTournamentConfig } from '../config/tournament.loader.js';

export async function getSettings(_req: Request, res: Response) {
  res.json(await settingsService.getSettings());
}

export async function getTournamentConfig(_req: Request, res: Response) {
  res.json(await loadTournamentConfig());
}

export async function updateSettings(req: Request, res: Response) {
  const { captainsCanChangeEaClubId, eaClubIdChangeCooldownHours, captainsCanAddMatches } = req.body ?? {};
  const patch: Record<string, unknown> = {};
  if (typeof captainsCanChangeEaClubId === 'boolean') patch.captainsCanChangeEaClubId = captainsCanChangeEaClubId;
  if (typeof eaClubIdChangeCooldownHours === 'number' && eaClubIdChangeCooldownHours >= 0) { patch.eaClubIdChangeCooldownHours = eaClubIdChangeCooldownHours; }
  if (typeof captainsCanAddMatches === 'boolean') patch.captainsCanAddMatches = captainsCanAddMatches;
  res.json(await settingsService.updateSettings(patch));
}
