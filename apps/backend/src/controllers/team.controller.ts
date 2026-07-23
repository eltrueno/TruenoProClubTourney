import type { Request, Response } from 'express';
import * as teamService from '../services/team.service.js';
import * as captainService from '../services/captain.service.js';
import * as eaService from '../services/ea.service.js';

function apiError(res: Response, httpStatus: number, code: string, message: string) {
  return res.status(httpStatus).json({ status: { code, message } });
}

export async function getMine(req: Request, res: Response) {
  const teamId = await captainService.getTeamIdForCaptain(req.user!.id);
  if (!teamId) return apiError(res, 404, 'NOT_A_CAPTAIN', 'No eres capitán de ningún equipo');
  const team = await teamService.getTeamById(teamId);
  if (!team) return apiError(res, 404, 'NOT_FOUND', 'Equipo no encontrado');
  res.json(team);
}

export async function list(_req: Request, res: Response) {
  const teams = await teamService.listTeams();
  res.json(teams);
}

export async function getOne(req: Request, res: Response) {
  const team = await teamService.getTeamById(req.params.id);
  if (!team) return apiError(res, 404, 'NOT_FOUND', 'Equipo no encontrado');
  res.json(team);
}

export async function create(req: Request, res: Response) {
  const { name, countryCode, logoUrl, group } = req.body ?? {};
  if (!name) return apiError(res, 400, 'BAD_REQUEST', 'Falta name');
  try {
    const team = await teamService.createTeam({ name, countryCode, logoUrl, group });
    res.status(201).json(team);
  } catch (err) {
    return apiError(res, 400, 'BAD_REQUEST', err instanceof Error ? err.message : 'Error creando equipo');
  }
}

export async function update(req: Request, res: Response) {
  const team = await teamService.updateTeam(req.params.id, req.body ?? {});
  if (!team) return apiError(res, 404, 'NOT_FOUND', 'Equipo no encontrado');
  res.json(team);
}

export async function assignCaptain(req: Request, res: Response) {
  const { userId } = req.body ?? {};
  if (!userId) return apiError(res, 400, 'BAD_REQUEST', 'Falta userId');
  const captain = await teamService.setTeamCaptain(req.params.id, userId);
  res.status(201).json(captain);
}

export async function removeCaptain(req: Request, res: Response) {
  await teamService.removeTeamCaptain(req.params.id);
  res.status(204).send();
}

export async function searchEaClub(req: Request, res: Response) {
  const { query } = req.query;
  if (!query || typeof query !== 'string' || query.trim().length < 3) {
    return apiError(res, 400, 'BAD_REQUEST', 'Escribe al menos 3 caracteres');
  }
  const results = await eaService.searchClubs(query.trim());
  res.json(results);
}

export async function setEaClubId(req: Request, res: Response) {
  const { eaClubId } = req.body ?? {};
  if (!eaClubId) return apiError(res, 400, 'BAD_REQUEST', 'Falta eaClubId');
  try {
    const team = await teamService.setEaClubId(req.params.id, eaClubId, req.user!.id);
    if (!team) return apiError(res, 404, 'NOT_FOUND', 'Equipo no encontrado');
    res.json(team);
  } catch (err) {
    if (err instanceof Error && err.message === 'FORBIDDEN') {
      return apiError(res, 403, 'FORBIDDEN', 'No eres capitán de este equipo');
    }
    if (err instanceof Error && err.message === 'EA_CLUB_ID_CHANGES_DISABLED') {
      return apiError(res, 403, 'EA_CLUB_ID_CHANGES_DISABLED', 'El admin ha desactivado que los capitanes cambien el EA Club ID ahora mismo');
    }
    if (err instanceof Error && err.message.startsWith('EA_CLUB_ID_COOLDOWN:')) {
      const remainingHours = err.message.split(':')[1];
      return apiError(res, 429, 'EA_CLUB_ID_COOLDOWN', `Solo puedes cambiar el EA Club ID una vez cada cierto tiempo. Vuelve a intentarlo en ${remainingHours}h`);
    }
    throw err;
  }
}
