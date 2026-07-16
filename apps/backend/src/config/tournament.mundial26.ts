import type { ITournamentConfig } from '@trueno-proclub-tourney/shared';

/**
 * Mundial 2026 (12 grupos de 4, 48 equipos, USA/México/Canadá).
 * teamIds sacados tal cual del dump de Mongo que pasaste (tpctmundial26.teams).
 *
 * IMPORTANTE sobre `bracket` (fixedCrossings / thirdPlacedSlots / halves):
 * - Esta app solo auto-resuelve la PRIMERA ronda de la eliminatoria (la que
 *   sale directo de "grupos" via resolveGroupsStage). Por eso aqui solo estan
 *   los 16 cruces de dieciseisavos (equivalen a los matches 73-88 del fixture
 *   oficial de FIFA).
 * - Octavos, cuartos, semis y final NO se generan solos: hay que crear esas
 *   Series a mano (POST /admin/series) con sourceA/sourceB = { type:
 *   'winnerOf', seriesId: <id de la serie anterior> }, siguiendo el arbol
 *   oficial (te lo paso aparte, no vive en este archivo).
 * - `halves` lo dejo vacio: con 8 mejores terceros cruzando grupos como
 *   quiere FIFA, cada mitad del cuadro toca practicamente los 12 grupos, así
 *   que una particion limpia por grupos no existe realmente (y el resolver
 *   no lee este campo, es solo referencia visual si algun dia se usa).
 * - No hay partido de 3er/4o puesto: el resolver solo propaga GANADORES
 *   (propagateWinner), no tiene concepto de "perdedor de semis", así que ese
 *   partido no puede modelarse con esta arquitectura tal cual esta hoy.
 *
 * slot usa el numero de partido oficial de FIFA (M73..M88) para que sea facil
 * de cruzar con el fixture real a la hora de crear las series de octavos.
 */
export const tournamentConfig: ITournamentConfig = {
  name: 'Copa Mundial de la FIFA 2026',

  stages: [
    {
      id: 'grupos',
      type: 'groups',
      name: 'Fase de grupos',
      groups: [
        { name: 'A', teamIds: ['6a57e79e6b13a666120bd3fe', '6a57e79e6b13a666120bd3ff', '6a57e79e6b13a666120bd400', '6a57e79e6b13a666120bd401'] }, // México, Sudáfrica, Corea del Sur, República Checa
        { name: 'B', teamIds: ['6a57e79e6b13a666120bd402', '6a57e79e6b13a666120bd403', '6a57e79e6b13a666120bd404', '6a57e79e6b13a666120bd405'] }, // Canadá, Bosnia y Herzegovina, Catar, Suiza
        { name: 'C', teamIds: ['6a57e79e6b13a666120bd406', '6a57e79e6b13a666120bd407', '6a57e79e6b13a666120bd408', '6a57e79e6b13a666120bd409'] }, // Brasil, Marruecos, Haití, Escocia
        { name: 'D', teamIds: ['6a57e79e6b13a666120bd40a', '6a57e79e6b13a666120bd40b', '6a57e79e6b13a666120bd40c', '6a57e79e6b13a666120bd40d'] }, // Estados Unidos, Paraguay, Australia, Turquía
        { name: 'E', teamIds: ['6a57e79e6b13a666120bd40e', '6a57e79e6b13a666120bd40f', '6a57e79e6b13a666120bd410', '6a57e79e6b13a666120bd411'] }, // Alemania, Curazao, Costa de Marfil, Ecuador
        { name: 'F', teamIds: ['6a57e79e6b13a666120bd412', '6a57e79e6b13a666120bd413', '6a57e79e6b13a666120bd414', '6a57e79e6b13a666120bd415'] }, // Países Bajos, Japón, Suecia, Túnez
        { name: 'G', teamIds: ['6a57e79e6b13a666120bd416', '6a57e79e6b13a666120bd417', '6a57e79e6b13a666120bd418', '6a57e79e6b13a666120bd419'] }, // Bélgica, Egipto, Irán, Nueva Zelanda
        { name: 'H', teamIds: ['6a57e79e6b13a666120bd41a', '6a57e79e6b13a666120bd41b', '6a57e79e6b13a666120bd41c', '6a57e79e6b13a666120bd41d'] }, // España, Cabo Verde, Arabia Saudí, Uruguay
        { name: 'I', teamIds: ['6a57e79e6b13a666120bd41e', '6a57e79e6b13a666120bd41f', '6a57e79e6b13a666120bd420', '6a57e79e6b13a666120bd421'] }, // Francia, Senegal, Irak, Noruega
        { name: 'J', teamIds: ['6a57e79e6b13a666120bd422', '6a57e79e6b13a666120bd423', '6a57e79e6b13a666120bd424', '6a57e79e6b13a666120bd425'] }, // Argentina, Argelia, Austria, Jordania
        { name: 'K', teamIds: ['6a57e79e6b13a666120bd426', '6a57e79e6b13a666120bd427', '6a57e79e6b13a666120bd428', '6a57e79e6b13a666120bd429'] }, // Portugal, R.D. Congo, Uzbekistán, Colombia
        { name: 'L', teamIds: ['6a57e79e6b13a666120bd42a', '6a57e79e6b13a666120bd42b', '6a57e79e6b13a666120bd42c', '6a57e79e6b13a666120bd42d'] }, // Inglaterra, Croacia, Ghana, Panamá
      ],
      tiebreak: ['points', 'goalDiff', 'goalsFor'],
      bestOf: 1,
      matchFormat: 'single',
      qualification: {
        perGroupAutoQualify: 2,
        bestOthers: 8,
      },
    },
    {
      id: 'eliminatoria',
      type: 'knockout',
      name: 'Eliminatorias',
      bestOf: 1,
      rounds: ['Dieciseisavos de final', 'Octavos de final', 'Cuartos de final', 'Semifinales', 'Final'],
      bracket: {
        halves: [
          { name: 'Mitad 1 (hacia semifinal 1)', groups: [] },
          { name: 'Mitad 2 (hacia semifinal 2)', groups: [] },
        ],
        // Los 8 cruces de dieciseisavos que salen de posiciones fijas de grupo (1o/2o)
        fixedCrossings: [
          { slot: 'M73', teamASource: { type: 'group', stageId: 'grupos', group: 'A', position: 2 }, teamBSource: { type: 'group', stageId: 'grupos', group: 'B', position: 2 } },
          { slot: 'M75', teamASource: { type: 'group', stageId: 'grupos', group: 'F', position: 1 }, teamBSource: { type: 'group', stageId: 'grupos', group: 'C', position: 2 } },
          { slot: 'M76', teamASource: { type: 'group', stageId: 'grupos', group: 'C', position: 1 }, teamBSource: { type: 'group', stageId: 'grupos', group: 'F', position: 2 } },
          { slot: 'M78', teamASource: { type: 'group', stageId: 'grupos', group: 'E', position: 2 }, teamBSource: { type: 'group', stageId: 'grupos', group: 'I', position: 2 } },
          { slot: 'M83', teamASource: { type: 'group', stageId: 'grupos', group: 'K', position: 2 }, teamBSource: { type: 'group', stageId: 'grupos', group: 'L', position: 2 } },
          { slot: 'M84', teamASource: { type: 'group', stageId: 'grupos', group: 'H', position: 1 }, teamBSource: { type: 'group', stageId: 'grupos', group: 'J', position: 2 } },
          { slot: 'M86', teamASource: { type: 'group', stageId: 'grupos', group: 'J', position: 1 }, teamBSource: { type: 'group', stageId: 'grupos', group: 'H', position: 2 } },
          { slot: 'M88', teamASource: { type: 'group', stageId: 'grupos', group: 'D', position: 2 }, teamBSource: { type: 'group', stageId: 'grupos', group: 'G', position: 2 } },
        ],
        // Los 8 cruces de dieciseisavos "ganador de grupo vs mejor tercero", segun el
        // reparto oficial de FIFA de que grupos alimentan cada hueco de tercero
        thirdPlacedSlots: [
          { slot: 'M74', fixedSide: 'teamA', fixedSource: { type: 'group', stageId: 'grupos', group: 'E', position: 1 }, othersStageId: 'grupos', excludeGroups: ['E', 'G', 'H', 'I', 'J', 'K', 'L'] }, // elegibles: A/B/C/D/F
          { slot: 'M77', fixedSide: 'teamA', fixedSource: { type: 'group', stageId: 'grupos', group: 'I', position: 1 }, othersStageId: 'grupos', excludeGroups: ['A', 'B', 'E', 'I', 'J', 'K', 'L'] }, // elegibles: C/D/F/G/H
          { slot: 'M79', fixedSide: 'teamA', fixedSource: { type: 'group', stageId: 'grupos', group: 'A', position: 1 }, othersStageId: 'grupos', excludeGroups: ['A', 'B', 'D', 'G', 'J', 'K', 'L'] }, // elegibles: C/E/F/H/I
          { slot: 'M80', fixedSide: 'teamA', fixedSource: { type: 'group', stageId: 'grupos', group: 'L', position: 1 }, othersStageId: 'grupos', excludeGroups: ['A', 'B', 'C', 'D', 'F', 'G', 'L'] }, // elegibles: E/H/I/J/K
          { slot: 'M81', fixedSide: 'teamA', fixedSource: { type: 'group', stageId: 'grupos', group: 'D', position: 1 }, othersStageId: 'grupos', excludeGroups: ['A', 'C', 'D', 'G', 'H', 'K', 'L'] }, // elegibles: B/E/F/I/J
          { slot: 'M82', fixedSide: 'teamA', fixedSource: { type: 'group', stageId: 'grupos', group: 'G', position: 1 }, othersStageId: 'grupos', excludeGroups: ['B', 'C', 'D', 'F', 'G', 'K', 'L'] }, // elegibles: A/E/H/I/J
          { slot: 'M85', fixedSide: 'teamA', fixedSource: { type: 'group', stageId: 'grupos', group: 'B', position: 1 }, othersStageId: 'grupos', excludeGroups: ['A', 'B', 'C', 'D', 'H', 'K', 'L'] }, // elegibles: E/F/G/I/J
          { slot: 'M87', fixedSide: 'teamA', fixedSource: { type: 'group', stageId: 'grupos', group: 'K', position: 1 }, othersStageId: 'grupos', excludeGroups: ['A', 'B', 'C', 'F', 'G', 'H', 'K'] }, // elegibles: D/E/I/J/L
        ],
      },
    },
  ],
};
