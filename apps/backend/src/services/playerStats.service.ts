import type {
  IPlayerAggregateStats,
  IPlayerMatchAppearance,
  IPlayerProfile,
} from '@trueno-pro-club-tourney/shared';
import { SeriesModel, type IMatchPlayerStatDoc } from '../models/Series.model.js';

interface Accumulator {
  eaPlayerId: string;
  playerName: string;
  lastPlayedAt: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
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
}

function newAccumulator(eaPlayerId: string, playerName: string): Accumulator {
  return {
    eaPlayerId,
    playerName,
    lastPlayedAt: 0,
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    draws: 0,
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
  };
}

function addStat(acc: Accumulator, stat: IMatchPlayerStatDoc, result: 'win' | 'loss' | 'draw', playedAt: number): void {
  // Se queda con el gamertag mas reciente, por si ha cambiado de nombre
  if (playedAt >= acc.lastPlayedAt) {
    acc.playerName = stat.playerName;
    acc.lastPlayedAt = playedAt;
  }

  acc.matchesPlayed += 1;
  if (result === 'win') acc.wins += 1;
  else if (result === 'loss') acc.losses += 1;
  else acc.draws += 1;

  acc.goals += stat.goals;
  acc.assists += stat.assists;
  acc.shots += stat.shots;
  acc.passAttempts += stat.passesMade;
  acc.passesMade += stat.passesSuccess;
  acc.tackleAttempts += stat.tacklesMade;
  acc.tacklesMade += stat.tacklesSuccess;
  acc.saves += stat.saves;
  acc.goalsConceded += stat.goalsConceded;
  if (stat.cleanSheet) acc.cleanSheets += 1;
  acc.redCards += stat.redCards;
  if (stat.manOfTheMatch) acc.manOfTheMatch += 1;
  acc.ratingSum += stat.rating;
}

function toAggregateStats(acc: Accumulator): IPlayerAggregateStats {
  const pct = (made: number, attempts: number) => (attempts > 0 ? Math.round((made / attempts) * 1000) / 10 : 0);

  return {
    eaPlayerId: acc.eaPlayerId,
    playerName: acc.playerName,
    matchesPlayed: acc.matchesPlayed,
    wins: acc.wins,
    losses: acc.losses,
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
    avgRating: acc.matchesPlayed > 0 ? Math.round((acc.ratingSum / acc.matchesPlayed) * 100) / 100 : 0,
  };
}

/** Recorre todas las Series y devuelve, por cada match confirmado, sus playerStats con contexto */
async function* iterConfirmedAppearances() {
  const seriesList = await SeriesModel.find({ 'matches.status': 'confirmed' });

  for (const series of seriesList) {
    for (const match of series.matches) {
      if (match.status !== 'confirmed') continue;
      if (match.effective.scoreA == null || match.effective.scoreB == null) continue;

      const scoreA = match.effective.scoreA;
      const scoreB = match.effective.scoreB;
      const playedAt = (match.original?.fetchedAt ?? series.createdAt).getTime();

      for (const stat of match.effective.playerStats) {
        const won = stat.team === 'A' ? scoreA > scoreB : scoreB > scoreA;
        const lost = stat.team === 'A' ? scoreA < scoreB : scoreB < scoreA;
        const result: 'win' | 'loss' | 'draw' = won ? 'win' : lost ? 'loss' : 'draw';

        yield { series, match, stat, scoreA, scoreB, result, playedAt };
      }
    }
  }
}

/** Stats agregadas de todos los jugadores que han aparecido en algun match confirmado */
export async function getAllPlayerStats(): Promise<IPlayerAggregateStats[]> {
  const acc = new Map<string, Accumulator>();

  for await (const { stat, result, playedAt } of iterConfirmedAppearances()) {
    if (!acc.has(stat.eaPlayerId)) acc.set(stat.eaPlayerId, newAccumulator(stat.eaPlayerId, stat.playerName));
    addStat(acc.get(stat.eaPlayerId)!, stat, result, playedAt);
  }

  return Array.from(acc.values())
    .map(toAggregateStats)
    .sort((a, b) => b.goals - a.goals || b.avgRating - a.avgRating);
}

/** Perfil de un jugador concreto: stats agregadas + historial de sus apariciones */
export async function getPlayerProfile(eaPlayerId: string): Promise<IPlayerProfile | null> {
  const acc = newAccumulator(eaPlayerId, eaPlayerId);
  const matches: (IPlayerMatchAppearance & { _playedAt: number })[] = [];

  for await (const { series, match, stat, scoreA, scoreB, result, playedAt } of iterConfirmedAppearances()) {
    if (stat.eaPlayerId !== eaPlayerId) continue;

    addStat(acc, stat, result, playedAt);
    matches.push({
      seriesId: series._id.toString(),
      stageId: series.stageId,
      round: series.round,
      group: series.group,
      position: match.position,
      teamAId: series.teamA ? series.teamA.toString() : null,
      teamBId: series.teamB ? series.teamB.toString() : null,
      playedTeam: stat.team,
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

  if (acc.matchesPlayed === 0) return null;

  matches.sort((a, b) => b._playedAt - a._playedAt);
  return {
    summary: toAggregateStats(acc),
    matches: matches.map(({ _playedAt, ...appearance }) => appearance),
  };
}
