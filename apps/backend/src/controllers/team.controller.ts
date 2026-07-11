import type { Request, Response } from 'express';
import * as teamService from '../services/team.service.js';

export async function list(_req: Request, res: Response) {
  const teams = await teamService.listTeams();
  res.json(teams);
}

export async function getOne(req: Request, res: Response) {
  const team = await teamService.getTeamById(req.params.id);
  if (!team) return res.status(404).json({ error: 'Equipo no encontrado' });
  res.json(team);
}

export async function create(req: Request, res: Response) {
  const { name, countryCode, logoUrl, group } = req.body ?? {};
  if (!name) {
    return res.status(400).json({ error: 'Falta name' });
  }
  try {
    const team = await teamService.createTeam({ name, countryCode, logoUrl, group });
    res.status(201).json(team);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Error creando equipo' });
  }
}

export async function update(req: Request, res: Response) {
  const team = await teamService.updateTeam(req.params.id, req.body ?? {});
  if (!team) return res.status(404).json({ error: 'Equipo no encontrado' });
  res.json(team);
}

export async function assignCaptain(req: Request, res: Response) {
  const { userId } = req.body ?? {};
  if (!userId) return res.status(400).json({ error: 'Falta userId' });
  const captain = await teamService.setTeamCaptain(req.params.id, userId);
  res.status(201).json(captain);
}

export async function removeCaptain(req: Request, res: Response) {
  await teamService.removeTeamCaptain(req.params.id);
  res.status(204).send();
}

/** El propio capitan configura el eaClubId de su equipo */
export async function setEaClubId(req: Request, res: Response) {
  const { eaClubId } = req.body ?? {};
  if (!eaClubId) return res.status(400).json({ error: 'Falta eaClubId' });

  try {
    const team = await teamService.setEaClubId(req.params.id, eaClubId, req.user!.id);
    if (!team) return res.status(404).json({ error: 'Equipo no encontrado' });
    res.json(team);
  } catch (err) {
    if (err instanceof Error && err.message === 'FORBIDDEN') {
      return res.status(403).json({ error: 'No eres capitan de este equipo' });
    }
    throw err;
  }
}
