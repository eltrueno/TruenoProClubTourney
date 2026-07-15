import type { Request, Response } from 'express';
import * as playerStatsService from '../services/playerStats.service.js';

function apiError(res: Response, httpStatus: number, code: string, message: string) {
  return res.status(httpStatus).json({ status: { code, message } });
}

export async function list(_req: Request, res: Response) {
  const stats = await playerStatsService.getAllPlayerStats();
  res.json(stats);
}

export async function getOne(req: Request, res: Response) {
  const profile = await playerStatsService.getPlayerProfile(req.params.eaPlayerId);
  if (!profile) return apiError(res, 404, 'NOT_FOUND', 'Este jugador no tiene partidas confirmadas');
  res.json(profile);
}
