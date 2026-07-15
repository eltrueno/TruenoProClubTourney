import type { IGroupsStageConfig, IGroupStanding, TiebreakCriterion } from '@trueno-pro-club-tourney/shared';
import { SeriesModel } from '../models/Series.model.js';

/**
 * Calcula la clasificacion de cada grupo DE UNA FASE CONCRETA (stage), a
 * partir de sus Series ya completadas. Puntuacion clasica de futbol:
 * victoria 3, empate 1, derrota 0 (funciona igual con bestOf=1 o bestOf=3,
 * se mira el resultado global de la serie).
 */
export async function computeGroupStandings(
  stage: IGroupsStageConfig
): Promise<Record<string, IGroupStanding[]>> {
  const groupSeries = await SeriesModel.find({ stageId: stage.id, status: 'completed' });

  const table = new Map<string, IGroupStanding>();
  for (const g of stage.groups) {
    for (const teamId of g.teamIds) {
      table.set(teamId, {
        teamId,
        group: g.name,
        played: 0,
        points: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDiff: 0,
      });
    }
  }

  for (const series of groupSeries) {
    if (!series.teamA || !series.teamB || !series.group) continue;

    const confirmed = series.matches.filter((m) => m.status === 'confirmed');
    const goalsA = confirmed.reduce((sum, m) => sum + (m.effective.scoreA ?? 0), 0);
    const goalsB = confirmed.reduce((sum, m) => sum + (m.effective.scoreB ?? 0), 0);

    const idA = series.teamA.toString();
    const idB = series.teamB.toString();
    const rowA = table.get(idA);
    const rowB = table.get(idB);
    if (!rowA || !rowB) continue;

    rowA.played += 1;
    rowB.played += 1;
    rowA.goalsFor += goalsA;
    rowA.goalsAgainst += goalsB;
    rowB.goalsFor += goalsB;
    rowB.goalsAgainst += goalsA;

    if (goalsA > goalsB) rowA.points += 3;
    else if (goalsB > goalsA) rowB.points += 3;
    else {
      rowA.points += 1;
      rowB.points += 1;
    }
  }

  for (const row of table.values()) {
    row.goalDiff = row.goalsFor - row.goalsAgainst;
  }

  const byGroup: Record<string, IGroupStanding[]> = {};
  for (const g of stage.groups) {
    const rows = g.teamIds.map((id) => table.get(id)!).filter(Boolean);
    byGroup[g.name] = rows.sort((a, b) => compareStandings(a, b, stage.tiebreak));
  }

  return byGroup;
}

function compareStandings(a: IGroupStanding, b: IGroupStanding, tiebreak: TiebreakCriterion[]): number {
  for (const criterion of tiebreak) {
    const diff = b[criterion] - a[criterion];
    if (diff !== 0) return diff;
  }
  return 0;
}
