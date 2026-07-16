import type { IMatchPlayer } from './series.types.js';

/**
 * Stats acumuladas de un jugador a lo largo de todo el torneo, calculadas
 * sobre los matches con status 'confirmado'. La referencia es siempre
 * eaPlayerId (el nombre puede cambiar entre partidas).
 */
export interface IPlayerAggregateStats {
  eaPlayerId: string;
  /** ultimo gamertag visto para este eaPlayerId */
  playerName: string;

  matchesPlayed: number;
  wins: number;
  losses: number;
  draws: number;

  goals: number;
  assists: number;
  shots: number;
  shotAccuracy: number; // %

  passAttempts: number;
  passesMade: number;
  passAccuracy: number; // %

  tackleAttempts: number;
  tacklesMade: number;
  tackleAccuracy: number; // %

  saves: number;
  goalsConceded: number;
  cleanSheets: number;

  redCards: number;
  manOfTheMatch: number;

  avgRating: number;
}

/** Una aparicion concreta de un jugador en un match confirmado, con contexto de la serie */
export interface IPlayerMatchAppearance {
  seriesId: string;
  stageId: string;
  round: string;
  group?: string;
  position: number;
  teamAId: string | null;
  teamBId: string | null;
  playedTeam: 'A' | 'B';
  result: 'win' | 'loss' | 'draw';
  scoreA: number;
  scoreB: number;
  stats: IMatchPlayer;
}

export interface IPlayerProfile {
  summary: IPlayerAggregateStats;
  matches: IPlayerMatchAppearance[];
}
