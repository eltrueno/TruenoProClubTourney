import type {
  IPlayerAggregateStats,
  IPlayerMatchAppearance,
  IPlayerProfile,
} from '@trueno-proclub-tourney/shared';
import { SeriesModel, type IMatchPlayerDoc } from '../models/Series.model.js';
import { PlayerStatsModel } from '../models/PlayerStats.model.js';
import { eventBus, EVENTS } from './events.service.js';

interface Accumulator {
  eaPlayerId: string;
  playerName: string;
  lastPlayedAt: number;
  matchesPlayed: number;
  minutesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  ties: number;
  goals: number;
  assists: number;
  shots: number;
  passAttempts: number;
  passesMade: number;
  tackleAttempts: number;
  tacklesMade: number;
  saves: number;
  goalsConceded: number;
  cleanSheets: number;
  redCards: number;
  manOfTheMatch: number;
  ratingSum: number;
  hattricks: number;
  pokers: number;
  positionsPlayed: Record<string, number>;
}

function newAccumulator(eaPlayerId: string, playerName: string): Accumulator {
  return {
    eaPlayerId,
    playerName,
    lastPlayedAt: 0,
    matchesPlayed: 0,
    minutesPlayed: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    ties: 0,
    goals: 0,
    assists: 0,
    shots: 0,
    passAttempts: 0,
    passesMade: 0,
    tackleAttempts: 0,
    tacklesMade: 0,
    saves: 0,
    goalsConceded: 0,
    cleanSheets: 0,
    redCards: 0,
    manOfTheMatch: 0,
    ratingSum: 0,
    hattricks: 0,
    pokers: 0,
    positionsPlayed: {},
  };
}

function addStat(acc: Accumulator, stat: IMatchPlayerDoc, result: 'win' | 'loss' | 'draw', playedAt: number): void {
  if (playedAt >= acc.lastPlayedAt) {
    acc.playerName = stat.name;
    acc.lastPlayedAt = playedAt;
  }

  const isWin = result === 'win';
  const isLoss = result === 'loss';
  const isTie = result === 'draw';
  
  const goals = Number(stat.goals) || 0;
  const isHattrick = goals >= 3;
  const isPoker = goals >= 4;

  acc.matchesPlayed += 1;
  acc.minutesPlayed += Math.round((Number(stat.secondsPlayed) || 0) / 60);
  
  if (isWin) acc.wins += 1;
  if (isLoss) acc.losses += 1;
  if (isTie) {
    acc.draws += 1;
    acc.ties += 1;
  }

  acc.goals += goals;
  acc.assists += Number(stat.assists) || 0;
  acc.shots += Number(stat.shots) || 0;
  acc.passAttempts += Number(stat.passesMade) || 0;
  acc.passesMade += Number(stat.passesSuccess) || 0;
  acc.tackleAttempts += Number(stat.tacklesMade) || 0;
  acc.tacklesMade += Number(stat.tacklesSuccess) || 0;
  acc.saves += Number(stat.saves) || 0;
  acc.goalsConceded += Number(stat.goalsConceded) || 0;
  if (stat.cleanSheet) acc.cleanSheets += 1;
  acc.redCards += Number(stat.redCards) || 0;
  if (stat.manOfTheMatch) acc.manOfTheMatch += 1;
  acc.ratingSum += Number(stat.rating) || 0;
  
  if (isHattrick) acc.hattricks += 1;
  if (isPoker) acc.pokers += 1;

  if (stat.position) {
    acc.positionsPlayed[stat.position] = (acc.positionsPlayed[stat.position] || 0) + 1;
  }
}

function toAggregateStats(acc: Accumulator): IPlayerAggregateStats {
  const pct = (made: number, attempts: number) => (attempts > 0 ? Math.round((made / attempts) * 1000) / 10 : 0);

  return {
    eaPlayerId: acc.eaPlayerId,
    playerName: acc.playerName,
    matchesPlayed: acc.matchesPlayed,
    minutesPlayed: acc.minutesPlayed,
    wins: acc.wins,
    losses: acc.losses,
    ties: acc.ties,
    draws: acc.draws,
    goals: acc.goals,
    assists: acc.assists,
    shots: acc.shots,
    shotAccuracy: pct(acc.goals, acc.shots),
    passAttempts: acc.passAttempts,
    passesMade: acc.passesMade,
    passAccuracy: pct(acc.passesMade, acc.passAttempts),
    tackleAttempts: acc.tackleAttempts,
    tacklesMade: acc.tacklesMade,
    tackleAccuracy: pct(acc.tacklesMade, acc.tackleAttempts),
    saves: acc.saves,
    goalsConceded: acc.goalsConceded,
    cleanSheets: acc.cleanSheets,
    redCards: acc.redCards,
    manOfTheMatch: acc.manOfTheMatch,
    hattricks: acc.hattricks,
    pokers: acc.pokers,
    positionsPlayed: acc.positionsPlayed,
    avgRating: acc.matchesPlayed > 0 ? Math.round((acc.ratingSum / acc.matchesPlayed) * 100) / 100 : 0,
  };
}

/** Recorre todas las Series y devuelve, por cada match confirmado, sus playerStats con contexto */
async function* iterConfirmedAppearances(eaPlayerIds?: string[]) {
  const query: any = { 'matches.status': 'confirmed' };
  if (eaPlayerIds && eaPlayerIds.length > 0) {
    query.$or = [
      { 'matches.effective.teamA.players.eaId': { $in: eaPlayerIds } },
      { 'matches.effective.teamB.players.eaId': { $in: eaPlayerIds } },
    ];
  }

  const seriesList = await SeriesModel.find(query);

  for (const series of seriesList) {
    for (const match of series.matches) {
      if (match.status !== 'confirmed') continue;
      if (!match.effective.teamA || !match.effective.teamB) continue;
      
      const scoreA = match.effective.teamA.score;
      const scoreB = match.effective.teamB.score;
      if (scoreA == null || scoreB == null) continue;
      
      const penA = match.effective.teamA.penaltiesScore ?? 0;
      const penB = match.effective.teamB.penaltiesScore ?? 0;

      const playedAt = (match.original?.fetchedAt ?? series.createdAt).getTime();
      
      let teamAWon = scoreA > scoreB;
      let teamBWon = scoreB > scoreA;
      if (scoreA === scoreB) {
        teamAWon = penA > penB;
        teamBWon = penB > penA;
      }

      for (const stat of match.effective.teamA.players) {
        if (eaPlayerIds && eaPlayerIds.length > 0 && !eaPlayerIds.includes(stat.eaId)) continue;
        const result: 'win' | 'loss' | 'draw' = teamAWon ? 'win' : teamBWon ? 'loss' : 'draw';
        yield { series, match, stat, scoreA, scoreB, result, playedAt, playedTeam: 'A' as const };
      }
      
      for (const stat of match.effective.teamB.players) {
        if (eaPlayerIds && eaPlayerIds.length > 0 && !eaPlayerIds.includes(stat.eaId)) continue;
        const result: 'win' | 'loss' | 'draw' = teamBWon ? 'win' : teamAWon ? 'loss' : 'draw';
        yield { series, match, stat, scoreA, scoreB, result, playedAt, playedTeam: 'B' as const };
      }
    }
  }
}

export async function recalculateStatsForPlayers(eaPlayerIds: string[]): Promise<void> {
  if (eaPlayerIds.length === 0) return;
  const acc = new Map<string, Accumulator>();

  for await (const { stat, result, playedAt } of iterConfirmedAppearances(eaPlayerIds)) {
    if (!acc.has(stat.eaId)) acc.set(stat.eaId, newAccumulator(stat.eaId, stat.name));
    addStat(acc.get(stat.eaId)!, stat, result, playedAt);
  }

  const ops: any[] = [];
  for (const eaId of eaPlayerIds) {
    if (acc.has(eaId)) {
      ops.push({
        updateOne: {
          filter: { _id: eaId },
          update: { $set: toAggregateStats(acc.get(eaId)!) },
          upsert: true,
        }
      });
    } else {
      ops.push({
        deleteOne: { filter: { _id: eaId } }
      });
    }
  }

  if (ops.length > 0) {
    await PlayerStatsModel.bulkWrite(ops);
  }
}

/** Stats agregadas obtenidas directamente de la colección cacheada */
export async function getAllPlayerStats(): Promise<IPlayerAggregateStats[]> {
  const docs = await PlayerStatsModel.find().sort({ goals: -1, avgRating: -1 });
  return docs;
}

/** Perfil de un jugador concreto: stats de la colección + historial de sus apariciones reconstruido */
export async function getPlayerProfile(eaPlayerId: string): Promise<IPlayerProfile | null> {
  const summaryDoc = await PlayerStatsModel.findById(eaPlayerId);
  if (!summaryDoc) return null;

  const matches: (IPlayerMatchAppearance & { _playedAt: number })[] = [];

  for await (const { series, match, stat, scoreA, scoreB, result, playedAt, playedTeam } of iterConfirmedAppearances([eaPlayerId])) {
    matches.push({
      seriesId: series._id.toString(),
      stageId: series.stageId,
      round: series.round,
      group: series.group,
      position: match.position,
      teamAId: series.teamA ? series.teamA.toString() : null,
      teamBId: series.teamB ? series.teamB.toString() : null,
      playedTeam,
      result,
      scoreA,
      scoreB,
      stats: {
        ...(stat as any).toObject ? (stat as any).toObject() : stat,
        editedAt: stat.editedAt?.toISOString(),
      } as any,
      _playedAt: playedAt,
    });
  }

  matches.sort((a, b) => b._playedAt - a._playedAt);
  
  const summary: IPlayerAggregateStats = summaryDoc.toObject ? summaryDoc.toObject() : summaryDoc;

  return {
    summary,
    matches: matches.map(({ _playedAt, ...appearance }) => appearance),
  };
}

// Escuchamos el evento para actualizar los stats en background de manera incremental
eventBus.on(EVENTS.PLAYER_STATS_UPDATE_REQUESTED, async ({ eaPlayerIds }: { eaPlayerIds: string[] }) => {
  try {
    await recalculateStatsForPlayers(eaPlayerIds);
  } catch (err) {
    console.error('Error recalculating player stats for players:', eaPlayerIds, err);
  }
});
