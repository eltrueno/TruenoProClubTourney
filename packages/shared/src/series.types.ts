import type { ISeriesSource } from './tournament-config.types.js';

export type MatchStatus =
  | 'unselected'
  | 'pending_confirmation'
  | 'confirmed'
  | 'disputed';

export type SeriesStatus = 'pending' | 'in_progress' | 'completed';
export type StageType = 'groups' | 'swissLeague' | 'knockout';
export type PlayerPosition = 'goalkeeper' | 'defender' | 'midfielder' | 'forward';

export interface ITeamMatchStats {
  goals: number;
  shots: number;
  passesMade: number;
  passesSuccess: number;
  tacklesMade: number;
  tacklesSuccess: number;
  redCards: number;
}

export interface IMatchPlayer {
  /**
   * ID numerico interno de EA (la clave del objeto players[clubId] en la
   * respuesta de la API). Referencia estable — el nombre puede cambiar.
   */
  eaId: string;
  /** Gamertag tal cual llegó de EA en esa partida, solo para mostrar */
  name: string;
  position: PlayerPosition;
  origin: 'ea' | 'manual';

  rating: number;
  secondsPlayed: number;
  manOfTheMatch: boolean;

  goals: number;
  assists: number;
  shots: number;

  goalsConceded: number;
  redCards: number;
  cleanSheet: boolean;

  passesMade: number;
  passesSuccess: number;

  tacklesMade: number;
  tacklesSuccess: number;

  // Portero (0 en el resto de posiciones)
  saves: number;
  goodDirectionSaves: number;
  crossSaves: number;
  ballDiveSaves: number;
  parrySaves: number;
  punchSaves: number;
  reflexSaves: number;

  editedBy?: string;
  editedAt?: string;
}

export interface IMatchTeamData {
  eaClubId?: string;
  eaClubName?: string;
  score: number | null;
  penaltiesScore?: number | null;
  stats: ITeamMatchStats;
  players: IMatchPlayer[];
}

export interface IMatchEdit {
  by: string;
  at: string;
  change: string;
}

export interface IMatchConfirmation {
  userId: string;
  at: string;
  teamA: { score: number; penaltiesScore?: number };
  teamB: { score: number; penaltiesScore?: number };
}

export interface IMatch {
  position: number;
  status: MatchStatus;
  eaMatchId?: string;
  isManual: boolean;
  winnerByDnf?: boolean;
  winnerByPen?: boolean;
  original?: {
    teamA: IMatchTeamData;
    teamB: IMatchTeamData;
    fetchedAt: string;
  };
  effective: {
    teamA: IMatchTeamData;
    teamB: IMatchTeamData;
  };
  edits: IMatchEdit[];
  confirmations: {
    byTeamA?: IMatchConfirmation;
    byTeamB?: IMatchConfirmation;
  };
}

export interface ISeries {
  id: string;
  teamA: string | import('./team.types.js').ITeam | null;
  teamB: string | import('./team.types.js').ITeam | null;
  sourceA?: ISeriesSource;
  sourceB?: ISeriesSource;
  bracketSlot?: string;
  stageId: string;
  stageType: StageType;
  round: string;
  group?: string;
  bestOf: 1 | 3;
  matches: IMatch[];
  usedEaMatchIds: string[];
  status: SeriesStatus;
  createdAt: string;
}

export interface IMySeriesResponse extends ISeries {
  mySide: 'A' | 'B';
}

export interface IEaCandidateMatch {
  eaMatchId: string;
  playedAt: string;
  winnerByDnf: boolean;
  winnerByPen: boolean;
  teamA: IMatchTeamData;
  teamB: IMatchTeamData;
}
