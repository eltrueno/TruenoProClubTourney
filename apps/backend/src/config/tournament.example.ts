import type { ITournamentConfig } from '@trueno-pro-club-tourney/shared';

/**
 * PLANTILLA DE EJEMPLO — 2 grupos de 4 equipos + semis/final, para que se
 * lea facil. Sirve igual para selecciones (Team.countryCode) o clubes
 * (Team.logoUrl).
 *
 * Para el torneo real de 48 equipos / 12 grupos / terceros clasificados:
 * misma forma, solo con mas entradas en `groups`, `qualification.bestOthers
 * = 8`, `bracket.thirdPlacedSlots` con las 8 posiciones reservadas, y
 * `rounds` = ["Octavos","Cuartos","Semis","Final"].
 *
 * Para un formato de liga suiza (tipo Champions): añade un stage de tipo
 * 'swissLeague' antes del de 'knockout' (el resolver aun no esta
 * implementado, pero la config ya lo admite).
 *
 * Los teamIds son placeholders — sustituir por los _id reales de Mongo.
 */
export const tournamentConfig: ITournamentConfig = {
  name: 'Torneo de ejemplo',

  stages: [
    {
      id: 'grupos',
      type: 'groups',
      name: 'Fase de grupos',
      groups: [
        { name: 'A', teamIds: ['<teamIdA1>', '<teamIdA2>', '<teamIdA3>', '<teamIdA4>'] },
        { name: 'B', teamIds: ['<teamIdB1>', '<teamIdB2>', '<teamIdB3>', '<teamIdB4>'] },
      ],
      tiebreak: ['points', 'goalDiff', 'goalsFor'],
      bestOf: 1,
      // 'single' = un partido contra cada rival. 'homeAndAway' = dos (ida y vuelta)
      matchFormat: 'single',
      qualification: {
        perGroupAutoQualify: 2, // 1o y 2o de cada grupo
        bestOthers: 0, // con solo 2 grupos no hay terceros; en el torneo real: 8
      },
    },
    {
      id: 'eliminatoria',
      type: 'knockout',
      name: 'Eliminatorias',
      bestOf: 1,
      rounds: ['Semis', 'Final'],
      bracket: {
        halves: [
          { name: 'Mitad 1', groups: ['A'] },
          { name: 'Mitad 2', groups: ['B'] },
        ],
        fixedCrossings: [
          {
            slot: 'SF-1',
            teamASource: { type: 'group', stageId: 'grupos', group: 'A', position: 1 },
            teamBSource: { type: 'group', stageId: 'grupos', group: 'B', position: 2 },
          },
          {
            slot: 'SF-2',
            teamASource: { type: 'group', stageId: 'grupos', group: 'B', position: 1 },
            teamBSource: { type: 'group', stageId: 'grupos', group: 'A', position: 2 },
          },
        ],
        thirdPlacedSlots: [], // vacio en este ejemplo reducido
      },
    },
  ],
};
