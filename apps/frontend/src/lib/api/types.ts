import type { IMatch, ITeam } from '@trueno-proclub-tourney/shared';

/** Resultado de un lado (equipo) en un marcador, tal y como lo manda el capitán o el admin */
export interface IMatchResultInput {
  score: number;
  penaltiesScore?: number | null;
}

export interface ICreateManualMatchInput {
  teamA: IMatchResultInput;
  teamB: IMatchResultInput;
}

export interface IEditMatchInput {
  teamA: IMatchResultInput;
  teamB: IMatchResultInput;
  changeDescription: string;
}

export interface IResolveDisputeInput {
  teamA: IMatchResultInput;
  teamB: IMatchResultInput;
}

export interface ICreateTeamInput {
  name: string;
  countryCode?: string;
  logoUrl?: string;
  group?: string;
}

export type IUpdateTeamInput = Partial<Omit<ICreateTeamInput, 'name'>> & { name?: string };


/** Un partido en disputa, tal y como lo lista el panel de admin */
export interface IDispute {
  seriesId: string;
  teamA: Pick<ITeam, 'id' | 'name' | 'countryCode'> | null;
  teamB: Pick<ITeam, 'id' | 'name' | 'countryCode'> | null;
  round: string;
  bestOf: 1 | 3;
  position: number;
  confirmations: IMatch['confirmations'];
  effective: IMatch['effective'];
}

/** Respuesta genérica de las acciones de admin que no devuelven un recurso (seed, resolve de fase...) */
export interface IOperationResult {
  status: { code: string; message: string };
}
