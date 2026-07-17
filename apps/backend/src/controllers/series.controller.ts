import type { Request, Response } from 'express';
import * as seriesService from '../services/series.service.js';
import * as bracketService from '../services/bracket.service.js';
import * as eaService from '../services/ea.service.js';
import { loadTournamentConfig } from '../config/tournament.loader.js';

function apiError(res: Response, httpStatus: number, code: string, message: string) {
  return res.status(httpStatus).json({ status: { code, message } });
}

export async function list(_req: Request, res: Response) {
  const series = await seriesService.listSeries();
  res.json(series);
}

export async function getOne(req: Request, res: Response) {
  const series = await seriesService.getSeriesById(req.params.id);
  if (!series) return apiError(res, 404, 'NOT_FOUND', 'Serie no encontrada');
  res.json(series);
}

export async function listMine(req: Request, res: Response) {
  const series = await seriesService.listSeriesForCaptain(req.user!.id);
  res.json(series);
}

export async function listEaCandidates(req: Request, res: Response) {
  const { eaClubId } = req.query;
  if (!eaClubId || typeof eaClubId !== 'string') {
    return apiError(res, 400, 'BAD_REQUEST', 'Falta eaClubId');
  }
  const candidates = await eaService.listRecentClubMatches(eaClubId);
  const usedIds = await seriesService.filterConfirmedEaMatchIds(candidates.map((c) => c.eaMatchId));
  res.json(candidates.filter((c) => !usedIds.has(c.eaMatchId)));
}

export async function selectCandidate(req: Request, res: Response) {
  const { position } = req.params;
  const candidate = req.body;

  try {
    const series = await seriesService.selectCandidateForMatch(
      req.params.id,
      Number(position),
      req.user!.id,
      candidate
    );
    res.json(series);
  } catch (err) {
    handleServiceError(err, res);
  }
}

export async function createManual(req: Request, res: Response) {
  const { teamA, teamB } = req.body ?? {};
  if (typeof teamA?.score !== 'number' || typeof teamB?.score !== 'number') {
    return apiError(res, 400, 'BAD_REQUEST', 'Faltan los marcadores de teamA/teamB');
  }

  try {
    const series = await seriesService.createManualMatch(
      req.params.id,
      Number(req.params.position),
      req.user!.id,
      req.body
    );
    res.json(series);
  } catch (err) {
    handleServiceError(err, res);
  }
}

export async function confirm(req: Request, res: Response) {
  try {
    const series = await seriesService.confirmMatch(req.params.id, Number(req.params.position), req.user!.id);
    await maybePropagate(series.id, series.stageId, series.status);
    res.json(series);
  } catch (err) {
    handleServiceError(err, res);
  }
}

export async function unselect(req: Request, res: Response) {
  try {
    const series = await seriesService.unselectMatch(req.params.id, Number(req.params.position), req.user!.id);
    res.json(series);
  } catch (err) {
    handleServiceError(err, res);
  }
}

export async function edit(req: Request, res: Response) {
  const { teamA, teamB, changeDescription } = req.body ?? {};
  if (!teamA || !teamB || !changeDescription) {
    return apiError(res, 400, 'BAD_REQUEST', 'Faltan teamA, teamB o changeDescription');
  }

  try {
    const series = await seriesService.editMatch(
      req.params.id,
      Number(req.params.position),
      req.user!.id,
      { teamA, teamB },
      changeDescription
    );
    res.json(series);
  } catch (err) {
    handleServiceError(err, res);
  }
}

async function maybePropagate(seriesId: string, stageId: string, status: string) {
  if (status !== 'completed') return;
  await bracketService.propagateWinner(seriesId);

  const config = await loadTournamentConfig();
  await bracketService.checkAndAutoAdvanceStage(config, stageId);
}

function handleServiceError(err: unknown, res: Response) {
  if (err instanceof seriesService.ServiceError) {
    const statusByCode: Record<string, number> = {
      NOT_FOUND: 404,
      FORBIDDEN: 403,
      NOT_A_CAPTAIN: 403,
      ALREADY_USED: 409,
      ALREADY_SET: 409,
      CANNOT_UNSELECT: 409,
      NOTHING_TO_CONFIRM: 400,
    };
    return res.status(statusByCode[err.code] ?? 400).json({ status: { code: err.code, message: err.message } });
  }
  throw err;
}
