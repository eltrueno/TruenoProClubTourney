import type {
  ITournamentConfig,
  IStageConfig,
  IGroupsStageConfig,
  IGroupStanding,
  ISeriesSource,
} from '@trueno-proclub-tourney/shared';
import { SeriesModel, type ISeriesDoc } from '../models/Series.model.js';
import { computeGroupStandings } from './standings.service.js';
import { createSeries } from './series.service.js';

export function getStageConfig(config: ITournamentConfig, stageId: string): IStageConfig {
  const stage = config.stages.find((s) => s.id === stageId);
  if (!stage) throw new Error(`No existe la fase "${stageId}" en la config del torneo`);
  return stage;
}

/**
 * Punto de entrada generico: se dispara (por un admin) cuando una fase ha
 * terminado, para rellenar teamA/teamB de las series que dependen de ella.
 * El comportamiento depende del tipo de fase.
 */
export async function resolveStage(config: ITournamentConfig, stageId: string): Promise<void> {
  const stage = getStageConfig(config, stageId);

  if (stage.type === 'groups') {
    await resolveGroupsStage(config, stage);
    return;
  }

  if (stage.type === 'swissLeague') {
    throw new Error(
      'El resolver de liga suiza todavia no esta implementado. El tipo existe en la config para cuando haga falta.'
    );
  }

  // 'knockout' no necesita resolverse explicitamente: sus series se rellenan
  // progresivamente via propagateWinner() a medida que acaban las anteriores.
}

async function resolveGroupsStage(config: ITournamentConfig, stage: IGroupsStageConfig): Promise<void> {
  const standingsByGroup = await computeGroupStandings(stage);

  const dependentSeries = await SeriesModel.find({
    $or: [
      { 'sourceA.type': 'group', 'sourceA.stageId': stage.id },
      { 'sourceB.type': 'group', 'sourceB.stageId': stage.id },
      { 'sourceA.type': 'stageOthers', 'sourceA.stageId': stage.id },
      { 'sourceB.type': 'stageOthers', 'sourceB.stageId': stage.id },
    ],
  });

  // 1) Cruces fijos por posicion de grupo (1o/2o...)
  for (const series of dependentSeries) {
    const sourceA = series.sourceA as ISeriesSource | undefined;
    const sourceB = series.sourceB as ISeriesSource | undefined;

    if (sourceA?.type === 'group' && sourceA.stageId === stage.id) {
      series.teamA = resolveGroupPosition(sourceA, standingsByGroup);
    }
    if (sourceB?.type === 'group' && sourceB.stageId === stage.id) {
      series.teamB = resolveGroupPosition(sourceB, standingsByGroup);
    }
  }

  // 2) "Otros" clasificados (ej. mejores terceros), si esta fase los produce
  if (stage.qualification.bestOthers > 0) {
    const thirdPlacedSlots = findThirdPlacedSlotsFor(config, stage.id);

    const candidates = stage.groups
      .map((g) => standingsByGroup[g.name]?.[stage.qualification.perGroupAutoQualify])
      .filter((row): row is IGroupStanding => Boolean(row));

    const bestOthers = candidates
      .sort((a, b) => b.points - a.points || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor)
      .slice(0, stage.qualification.bestOthers);

    const remaining = [...bestOthers];

    for (const series of dependentSeries) {
      if (!series.bracketSlot) continue;

      const slotDef = thirdPlacedSlots.find((s) => s.slot === series.bracketSlot);
      if (!slotDef) continue;

      // El lado "others" es siempre el contrario al lado fijo declarado en la config
      const othersSide: 'A' | 'B' = slotDef.fixedSide === 'teamA' ? 'B' : 'A';
      const othersSource = (othersSide === 'A' ? series.sourceA : series.sourceB) as ISeriesSource | undefined;
      if (!othersSource || othersSource.type !== 'stageOthers' || othersSource.stageId !== stage.id) continue;

      const excluded = slotDef.excludeGroups ?? [];

      const idx = remaining.findIndex((row) => !excluded.includes(row.group));
      if (idx === -1) continue; // no deberia pasar con una config bien formada

      const [chosen] = remaining.splice(idx, 1);
      if (othersSide === 'A') series.teamA = chosen.teamId as unknown as ISeriesDoc['teamA'];
      else series.teamB = chosen.teamId as unknown as ISeriesDoc['teamB'];
    }
  }

  await Promise.all(dependentSeries.map((s) => s.save()));
}

function findThirdPlacedSlotsFor(config: ITournamentConfig, groupsStageId: string) {
  const knockouts = config.stages.filter((s): s is Extract<IStageConfig, { type: 'knockout' }> => s.type === 'knockout');
  return knockouts.flatMap((k) => k.bracket.thirdPlacedSlots.filter((slot) => slot.othersStageId === groupsStageId));
}

function resolveGroupPosition(
  source: Extract<ISeriesSource, { type: 'group' }>,
  standingsByGroup: Record<string, IGroupStanding[]>
): ISeriesDoc['teamA'] {
  const row = standingsByGroup[source.group]?.[source.position - 1];
  if (!row) throw new Error(`No hay clasificado en posicion ${source.position} del grupo ${source.group}`);
  return row.teamId as unknown as ISeriesDoc['teamA'];
}

/**
 * Se dispara cuando una Series pasa a status='completed'. Busca otras
 * Series cuyo sourceA/sourceB sea winnerOf esa serie, y les rellena el
 * equipo correspondiente con el ganador. Generico, no depende del tipo de fase.
 */
export async function propagateWinner(completedSeriesId: string): Promise<void> {
  const completed = await SeriesModel.findById(completedSeriesId);
  if (!completed || completed.status !== 'completed') return;

  const winnerTeamId = getWinnerTeamId(completed);
  if (!winnerTeamId) return;

  const dependents = await SeriesModel.find({
    $or: [
      { 'sourceA.type': 'winnerOf', 'sourceA.seriesId': completedSeriesId },
      { 'sourceB.type': 'winnerOf', 'sourceB.seriesId': completedSeriesId },
    ],
  });

  for (const dep of dependents) {
    const sourceA = dep.sourceA as ISeriesSource | undefined;
    const sourceB = dep.sourceB as ISeriesSource | undefined;

    if (sourceA?.type === 'winnerOf' && sourceA.seriesId === completedSeriesId) {
      dep.teamA = winnerTeamId as unknown as ISeriesDoc['teamA'];
    }
    if (sourceB?.type === 'winnerOf' && sourceB.seriesId === completedSeriesId) {
      dep.teamB = winnerTeamId as unknown as ISeriesDoc['teamB'];
    }
    await dep.save();
  }
}

function getWinnerTeamId(series: ISeriesDoc): string | null {
  const confirmed = series.matches.filter((m) => m.status === 'confirmed');

  const winsA = confirmed.filter(
    (m) => {
      const scoreA = m.effective.teamA?.score ?? 0;
      const scoreB = m.effective.teamB?.score ?? 0;
      if (scoreA > scoreB) return true;
      if (scoreA === scoreB) return (m.effective.teamA?.penaltiesScore ?? 0) > (m.effective.teamB?.penaltiesScore ?? 0);
      return false;
    }
  ).length;

  const winsB = confirmed.filter(
    (m) => {
      const scoreA = m.effective.teamA?.score ?? 0;
      const scoreB = m.effective.teamB?.score ?? 0;
      if (scoreB > scoreA) return true;
      if (scoreB === scoreA) return (m.effective.teamB?.penaltiesScore ?? 0) > (m.effective.teamA?.penaltiesScore ?? 0);
      return false;
    }
  ).length;

  if (winsA === winsB) return null;
  return winsA > winsB ? (series.teamA?.toString() ?? null) : (series.teamB?.toString() ?? null);
}

/**
 * Genera automaticamente todas las Series de una fase de grupos: todos
 * contra todos dentro de cada grupo. Segun `matchFormat`:
 *  - 'single': 1 serie por cada pareja de equipos del grupo
 *  - 'homeAndAway': 2 series por pareja, con teamA/teamB invertidos en la vuelta
 *
 * Es seguro llamarla mas de una vez por error: si la fase ya tiene series,
 * no crea duplicados.
 */
export async function seedGroupsStage(stage: IGroupsStageConfig): Promise<void> {
  const existing = await SeriesModel.countDocuments({ stageId: stage.id });
  if (existing > 0) {
    throw new Error(
      `La fase "${stage.id}" ya tiene ${existing} series creadas. Borralas primero si quieres regenerar el fixture.`
    );
  }

  for (const group of stage.groups) {
    const teamIds = group.teamIds;

    for (let i = 0; i < teamIds.length; i++) {
      for (let j = i + 1; j < teamIds.length; j++) {
        await createSeries({
          teamA: teamIds[i],
          teamB: teamIds[j],
          stageId: stage.id,
          stageType: 'groups',
          round: stage.name,
          group: group.name,
          bestOf: stage.bestOf,
        });

        if (stage.matchFormat === 'homeAndAway') {
          await createSeries({
            teamA: teamIds[j],
            teamB: teamIds[i],
            stageId: stage.id,
            stageType: 'groups',
            round: stage.name,
            group: group.name,
            bestOf: stage.bestOf,
          });
        }
      }
    }
  }
}

/**
 * Se llama tras cada Series que termina. Si pertenece a una fase de grupos y
 * TODAS las series de esa fase ya estan completadas, resuelve automaticamente
 * la fase siguiente (rellena teamA/teamB de knockout) sin esperar a que un
 * admin lo dispare a mano.
 */
export async function checkAndAutoAdvanceStage(config: ITournamentConfig, stageId: string): Promise<void> {
  const stage = getStageConfig(config, stageId);
  if (stage.type !== 'groups') return; // knockout ya se propaga solo via propagateWinner

  const total = await SeriesModel.countDocuments({ stageId });
  if (total === 0) return;

  const completed = await SeriesModel.countDocuments({ stageId, status: 'completed' });
  if (completed < total) return;

  await resolveGroupsStage(config, stage);
}
