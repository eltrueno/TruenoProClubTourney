import type { Request, Response } from 'express';
import * as seriesService from '../services/series.service.js';
import * as bracketService from '../services/bracket.service.js';
import { loadTournamentConfig } from '../config/tournament.loader.js';

function apiError(res: Response, httpStatus: number, code: string, message: string) {
  return res.status(httpStatus).json({ status: { code, message } });
}

export async function listDisputes(_req: Request, res: Response) {
  const disputes = await seriesService.listDisputes();
  res.json(disputes);
}

export async function resolveDispute(req: Request, res: Response) {
  const { teamA, teamB } = req.body ?? {};
  if (!teamA || !teamB) {
    return apiError(res, 400, 'BAD_REQUEST', 'Faltan teamA o teamB');
  }
  const series = await seriesService.resolveDispute(
    req.params.id,
    Number(req.params.position),
    req.user!.id,
    { teamA, teamB }
  );
  if (series.status === 'completed') {
    await bracketService.propagateWinner(series.id);
    const config = await loadTournamentConfig();
    await bracketService.checkAndAutoAdvanceStage(config, series.stageId);
  }
  res.json(series);
}

export async function seedGroupsStage(req: Request, res: Response) {
  const config = await loadTournamentConfig();
  const stage = bracketService.getStageConfig(config, req.params.stageId);
  if (stage.type !== 'groups') {
    return apiError(res, 400, 'BAD_REQUEST', `La fase "${stage.id}" no es de tipo groups`);
  }
  try {
    await bracketService.seedGroupsStage(stage);
    res.json({ status: { code: 'OK', message: `Fixture generado para la fase "${stage.id}"` } });
  } catch (err) {
    return apiError(res, 400, 'SEED_FAILED', err instanceof Error ? err.message : 'Error generando el fixture');
  }
}

export async function createSeries(req: Request, res: Response) {
  const { teamA, teamB, sourceA, sourceB, bracketSlot, stageId, stageType, round, group, bestOf } = req.body ?? {};
  if (!stageId || !stageType || !round || !bestOf) {
    return apiError(res, 400, 'BAD_REQUEST', 'Faltan stageId, stageType, round o bestOf');
  }
  const series = await seriesService.createSeries({
    teamA, teamB, sourceA, sourceB, bracketSlot, stageId, stageType, round, group, bestOf,
  });
  res.status(201).json(series);
}

export async function resolveStage(req: Request, res: Response) {
  const config = await loadTournamentConfig();
  try {
    await bracketService.resolveStage(config, req.params.stageId);
    res.json({ status: { code: 'OK', message: `Fase "${req.params.stageId}" resuelta` } });
  } catch (err) {
    return apiError(res, 400, 'RESOLVE_FAILED', err instanceof Error ? err.message : 'Error resolviendo la fase');
  }
}
