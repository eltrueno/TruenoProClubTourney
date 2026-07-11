import type { ISeriesSource } from './tournament-config.types.js';

export type MatchStatus =
  | 'sin_seleccionar'
  | 'pendiente_confirmacion'
  | 'confirmado'
  | 'disputado';

export type SeriesStatus = 'pending' | 'in_progress' | 'completed';
/** Tipo de fase de la que forma parte esta serie (coincide con IStageConfig.type) */
export type StageType = 'groups' | 'swissLeague' | 'knockout';

export interface IMatchPlayerStat {
  /** id interno de EA del jugador. Es la referencia real, el nombre puede cambiar */
  eaPlayerId: string;
  /** nombre/gamertag tal cual vino en ese partido concreto, solo para mostrar */
  playerName: string;
  team: 'A' | 'B';
  goals: number;
  origin: 'ea' | 'manual';
  editedBy?: string;
  editedAt?: string;
}

export interface IMatchEdit {
  by: string;
  at: string;
  change: string;
}

export interface IMatchConfirmation {
  userId: string;
  at: string;
  scoreA: number;
  scoreB: number;
}

/** Cada partida individual dentro de una Series (bo1 o bo3 segun config del torneo) */
export interface IMatch {
  position: number;
  status: MatchStatus;

  eaMatchId?: string;
  isManual: boolean;

  /** Snapshot INMUTABLE de lo que devolvio la API de EA al elegir esta partida */
  original?: {
    scoreA: number;
    scoreB: number;
    playerStats: IMatchPlayerStat[];
    fetchedAt: string;
  };

  /** Lo que se da por bueno ahora mismo. Aqui se editan cosas si hace falta */
  effective: {
    scoreA: number | null;
    scoreB: number | null;
    playerStats: IMatchPlayerStat[];
  };

  edits: IMatchEdit[];

  confirmations: {
    byTeamA?: IMatchConfirmation;
    byTeamB?: IMatchConfirmation;
  };
}

export interface ISeries {
  id: string;
  teamA: string | null; // id de Team, null hasta que se resuelve (fases posteriores a grupos)
  teamB: string | null;

  sourceA?: ISeriesSource;
  sourceB?: ISeriesSource;

  /** posicion en el cuadro visual, ej "R32-1", "QF-3", "SF-1", "F" */
  bracketSlot?: string;

  /** referencia a IStageConfig.id de la fase a la que pertenece esta serie */
  stageId: string;
  stageType: StageType;
  round: string; // "Grupo A", "Octavos", "Cuartos", "Semis", "Final"
  group?: string;

  bestOf: 1 | 3;
  matches: IMatch[];

  usedEaMatchIds: string[];
  status: SeriesStatus;
  createdAt: string;
}

/** Un partido candidato tal como lo devuelve la API de EA, antes de elegirlo para un slot */
export interface IEaCandidateMatch {
  eaMatchId: string;
  playedAt: string;
  scoreA: number;
  scoreB: number;
  playerStats: IMatchPlayerStat[];
}
