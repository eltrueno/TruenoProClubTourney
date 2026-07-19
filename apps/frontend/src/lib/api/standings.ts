import type { ISeries, ITeam } from '@trueno-proclub-tourney/shared';
import { teamBadge } from '.';

export interface StandingRow {
  teamId: string;
  name: string;
  logo: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
}

function idOf(t: string | ITeam | null | undefined): string | null {
  if (!t) return null;
  return typeof t === 'string' ? t : t.id;
}

/**
 * Calcula la clasificación por grupo a partir de las series de fase de grupos.
 * Incluye a todos los equipos que tengan `group` asignado (aunque no hayan jugado
 * todavía), y solo puntúa las series que ya tienen algún resultado confirmado.
 */
export function computeGroupStandings(teams: ITeam[], seriesList: ISeries[]): Map<string, StandingRow[]> {
  const groups = new Map<string, Map<string, StandingRow>>();

  function ensureRow(groupKey: string, team: ITeam): StandingRow {
    if (!groups.has(groupKey)) groups.set(groupKey, new Map());
    const g = groups.get(groupKey)!;
    if (!g.has(team.id)) {
      g.set(team.id, {
        teamId: team.id,
        name: team.name,
        logo: teamBadge(team),
        played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0,
      });
    }
    return g.get(team.id)!;
  }

  const teamsById = new Map(teams.map((t) => [t.id, t]));

  // Aseguramos que todos los equipos con grupo salgan en la tabla, aunque no hayan jugado
  for (const t of teams) {
    if (t.group) ensureRow(t.group, t);
  }

  for (const s of seriesList) {
    if (s.stageType !== 'groups') continue;
    const teamAId = idOf(s.teamA);
    const teamBId = idOf(s.teamB);
    if (!teamAId || !teamBId) continue;

    const teamA = teamsById.get(teamAId);
    const teamB = teamsById.get(teamBId);
    const groupKey = s.group ?? teamA?.group ?? teamB?.group;
    if (!groupKey || !teamA || !teamB) continue;

    const confirmed = s.matches.filter((m) => m.status === 'confirmed');
    if (confirmed.length === 0) continue;

    const gA = confirmed.reduce((acc, m) => acc + (m.effective.teamA?.score ?? 0), 0);
    const gB = confirmed.reduce((acc, m) => acc + (m.effective.teamB?.score ?? 0), 0);

    const rowA = ensureRow(groupKey, teamA);
    const rowB = ensureRow(groupKey, teamB);

    rowA.played += 1;
    rowB.played += 1;
    rowA.gf += gA;
    rowA.ga += gB;
    rowB.gf += gB;
    rowB.ga += gA;

    if (gA > gB) {
      rowA.won += 1;
      rowA.points += 3;
      rowB.lost += 1;
    } else if (gB > gA) {
      rowB.won += 1;
      rowB.points += 3;
      rowA.lost += 1;
    } else {
      rowA.drawn += 1;
      rowB.drawn += 1;
      rowA.points += 1;
      rowB.points += 1;
    }
  }

  const result = new Map<string, StandingRow[]>();
  for (const [groupKey, rows] of groups) {
    const arr = Array.from(rows.values()).map((r) => ({ ...r, gd: r.gf - r.ga }));
    arr.sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf || a.name.localeCompare(b.name));
    result.set(groupKey, arr);
  }
  return new Map([...result.entries()].sort(([a], [b]) => a.localeCompare(b)));
}
