import type { Request, Response } from 'express';
import * as seriesService from '../services/series.service.js';
import * as bracketService from '../services/bracket.service.js';
import { loadTournamentConfig } from '../config/tournament.loader.js';

export async function listDisputes(_req: Request, res: Response) {
  const disputes = await seriesService.listDisputes();
  res.json(disputes);
}

export async function resolveDispute(req: Request, res: Response) {
  const { scoreA, scoreB, playerStats } = req.body ?? {};
  if (scoreA == null || scoreB == null) {
    return res.status(400).json({ error: 'Faltan scoreA o scoreB' });
  }

  const series = await seriesService.resolveDispute(
    req.params.id,
    Number(req.params.position),
    req.user!.id,
    { scoreA, scoreB, playerStats: playerStats ?? [] }
  );

  if (series.status === 'completed') {
    await bracketService.propagateWinner(series.id);
  }

  res.json(series);
}

export async function createSeries(req: Request, res: Response) {
  const { teamA, teamB, sourceA, sourceB, bracketSlot, stageId, stageType, round, group, bestOf } = req.body ?? {};
  if (!stageId || !stageType || !round || !bestOf) {
    return res.status(400).json({ error: 'Faltan stageId, stageType, round o bestOf' });
  }

  const series = await seriesService.createSeries({
    teamA,
    teamB,
    sourceA,
    sourceB,
    bracketSlot,
    stageId,
    stageType,
    round,
    group,
    bestOf,
  });
  res.status(201).json(series);
}

/** Se dispara cuando el admin da por cerrada una fase concreta (ej. la de grupos) */
export async function resolveStage(req: Request, res: Response) {
  const config = await loadTournamentConfig();
  try {
    await bracketService.resolveStage(config, req.params.stageId);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Error resolviendo la fase' });
  }
}
