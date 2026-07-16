export interface ITeam {
  id: string;
  name: string;
  /**
   * Selecciones: countryCode (ISO 3166-1 alpha-2) para pintar bandera via flagcdn.
   * Clubes: logoUrl con el escudo. Usa uno de los dos segun el torneo.
   */
  countryCode?: string;
  logoUrl?: string;
  /** grupo dentro de la fase a la que pertenezca, si aplica */
  group?: string;
  /** Lo configura el propio capitan desde su panel, no el admin */
  eaClubId?: string;
  /** Nombre del club en EA, resuelto automaticamente al guardar el eaClubId */
  eaClubName?: string;
  eaClubIdSetBy?: string;
  eaClubIdSetAt?: string;
  /** Nombre publico del capitan actual del equipo, si tiene uno asignado */
  captainName?: string;
  createdAt: string;
}

export interface ITeamCreateInput {
  name: string;
  countryCode?: string;
  logoUrl?: string;
  group?: string;
}
