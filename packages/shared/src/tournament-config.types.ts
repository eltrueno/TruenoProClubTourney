export type TiebreakCriterion = 'points' | 'goalDiff' | 'goalsFor';

export interface IGroupConfig {
  name: string; // "A", "B"...
  teamIds: string[];
}

/**
 * De donde sale un equipo que entra a una fase de eliminatoria. stageId
 * identifica la fase de la que proviene (referencia a IStageConfig.id).
 */
export type ISeriesSource =
  | { type: 'group'; stageId: string; group: string; position: number }
  /** el resto de clasificados de una fase que no entran por posicion fija de grupo
   *  (ej. "mejores terceros"). Se resuelve segun la logica propia de esa fase. */
  | { type: 'stageOthers'; stageId: string }
  | { type: 'winnerOf'; seriesId: string };

export interface IBracketSource {
  type: 'group';
  stageId: string;
  group: string;
  position: number;
}

export interface IFixedCrossing {
  slot: string; // "R32-1"
  teamASource: IBracketSource;
  teamBSource: IBracketSource;
}

export interface IThirdPlacedSlot {
  slot: string;
  /** lado de la serie que ocupa la posicion fija (p.ej. 1o de un grupo concreto).
   *  El lado contrario es el que rellena el resolver con el mejor "other" disponible. */
  fixedSide: 'teamA' | 'teamB';
  fixedSource: IBracketSource;
  /** referencia a la fase de grupos de la que salen los "others" */
  othersStageId: string;
  /** grupos cuyo clasificado NO puede caer aqui (tipicamente el propio grupo del rival) */
  excludeGroups: string[];
}

export interface IBracketHalf {
  name: string;
  groups: string[];
}

export interface IBracketConfig {
  halves: IBracketHalf[];
  fixedCrossings: IFixedCrossing[];
  /** vacio si esta fase no tiene clasificacion de "otros" (ej. terceros) */
  thirdPlacedSlots: IThirdPlacedSlot[];
}

/** Fase de grupos clasicos: N grupos, todos contra todos dentro del grupo */
export interface IGroupsStageConfig {
  id: string;
  type: 'groups';
  name: string; // "Fase de grupos"
  groups: IGroupConfig[];
  tiebreak: TiebreakCriterion[];
  bestOf: 1 | 3;
  /**
   * 'single': cada equipo juega 1 vez contra cada rival de su grupo.
   * 'homeAndAway': cada equipo juega 2 veces contra cada rival (ida y vuelta,
   * los lados de teamA/teamB se invierten en la vuelta).
   */
  matchFormat: 'single' | 'homeAndAway';
  qualification: {
    perGroupAutoQualify: number; // ej. 2 (1o y 2o)
    bestOthers: number; // ej. 8 (mejores terceros), o 0 si no aplica
  };
}

/**
 * Fase de liga suiza (formato Champions 2024+): una unica tabla, cada
 * equipo juega un numero fijo de partidos contra rivales distintos (no
 * todos contra todos). El resolver de esta fase no esta implementado
 * todavia -- el tipo existe para que la arquitectura lo soporte el dia
 * que haga falta, sin tener que rediseñar nada.
 */
export interface ISwissLeagueStageConfig {
  id: string;
  type: 'swissLeague';
  name: string;
  teamIds: string[];
  matchesPerTeam: number;
  bestOf: 1 | 3;
  qualifyDirect: number; // clasifican directos a octavos/knockout
  playoffSlots: number; // juegan un play-off previo
}

/** Fase de eliminacion directa. Puede alimentarse de una fase de grupos, de
 *  liga suiza, o de la propia estructura interna (ganador de ronda anterior) */
export interface IKnockoutStageConfig {
  id: string;
  type: 'knockout';
  name: string;
  bestOf: 1 | 3;
  bracket: IBracketConfig;
  /** rondas en orden, ej ["Octavos","Cuartos","Semis","Final"] */
  rounds: string[];
}

export type IStageConfig = IGroupsStageConfig | ISwissLeagueStageConfig | IKnockoutStageConfig;

export interface ITournamentConfig {
  name: string;
  /** en orden: cada fase puede alimentarse de las anteriores via su `id` */
  stages: IStageConfig[];
}
