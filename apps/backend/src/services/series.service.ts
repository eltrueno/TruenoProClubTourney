import type {
  ISeries,
  IMatch,
  IMatchPlayerStat,
  IEaCandidateMatch,
} from '@trueno-pro-club-tourney/shared';
import { SeriesModel, type ISeriesDoc, type IMatchDoc } from '../models/Series.model.js';
import { getTeamIdForCaptain } from './captain.service.js';

function toIMatch(doc: IMatchDoc): IMatch {
  return JSON.parse(JSON.stringify(doc)); // subdocumento plano, basta serializar
}

/** El tipo compartido usa string para fechas (viaja por JSON); mongoose quiere Date */
function toPlayerStatDoc(stat: IMatchPlayerStat) {
  return {
    eaPlayerId: stat.eaPlayerId,
    playerName: stat.playerName,
    team: stat.team,
    goals: stat.goals,
    origin: stat.origin,
    editedBy: stat.editedBy,
    editedAt: stat.editedAt ? new Date(stat.editedAt) : undefined,
  };
}

function toISeries(doc: ISeriesDoc): ISeries {
  return {
    id: doc._id.toString(),
    teamA: doc.teamA ? doc.teamA.toString() : null,
    teamB: doc.teamB ? doc.teamB.toString() : null,
    sourceA: doc.sourceA as ISeries['sourceA'],
    sourceB: doc.sourceB as ISeries['sourceB'],
    bracketSlot: doc.bracketSlot,
    stageId: doc.stageId,
    stageType: doc.stageType,
    round: doc.round,
    group: doc.group,
    bestOf: doc.bestOf,
    matches: doc.matches.map(toIMatch),
    usedEaMatchIds: doc.usedEaMatchIds,
    status: doc.status,
    createdAt: doc.createdAt.toISOString(),
  };
}

export async function listSeries(): Promise<ISeries[]> {
  const docs = await SeriesModel.find().sort({ round: 1, createdAt: 1 });
  return docs.map(toISeries);
}

/** Series donde el usuario es capitan de alguno de los dos equipos, y aún no están completadas */
export async function listSeriesForCaptain(userId: string): Promise<ISeries[]> {
  const teamId = await getTeamIdForCaptain(userId);
  if (!teamId) return [];

  const docs = await SeriesModel.find({
    $or: [{ teamA: teamId }, { teamB: teamId }],
    status: { $ne: 'completed' },
  }).sort({ round: 1, createdAt: 1 });

  return docs.map(toISeries);
}

export async function getSeriesById(id: string): Promise<ISeries | null> {
  const doc = await SeriesModel.findById(id);
  return doc ? toISeries(doc) : null;
}

/** Uso interno del seed / resolver de bracket, no expuesto directo al capitan */
export async function createSeries(input: {
  teamA?: string | null;
  teamB?: string | null;
  sourceA?: ISeries['sourceA'];
  sourceB?: ISeries['sourceB'];
  bracketSlot?: string;
  stageId: string;
  stageType: ISeries['stageType'];
  round: string;
  group?: string;
  bestOf: 1 | 3;
}): Promise<ISeries> {
  const matches: IMatchDoc[] = Array.from({ length: input.bestOf }, (_, i) => ({
    position: i + 1,
    status: 'sin_seleccionar',
    isManual: false,
    effective: { scoreA: null, scoreB: null, playerStats: [] },
    edits: [],
    confirmations: {},
  }));

  const doc = await SeriesModel.create({ ...input, matches, usedEaMatchIds: [] });
  return toISeries(doc);
}

/** Determina si requesterUserId es capitan de teamA o teamB de esta serie */
async function resolveSide(
  series: ISeriesDoc,
  requesterUserId: string
): Promise<'A' | 'B'> {
  const teamId = await getTeamIdForCaptain(requesterUserId);
  if (!teamId) throw new ServiceError('NOT_A_CAPTAIN', 'No eres capitan de ningun equipo');

  if (series.teamA?.toString() === teamId) return 'A';
  if (series.teamB?.toString() === teamId) return 'B';

  throw new ServiceError('FORBIDDEN', 'No eres capitan de ninguno de los dos equipos de esta serie');
}

/** La candidata de EA llega con A=club solicitante. Esto la voltea si ese
 *  capitan resulta ser teamB en la Series real. */
function flipCandidateSides(candidate: IEaCandidateMatch): IEaCandidateMatch {
  return {
    ...candidate,
    scoreA: candidate.scoreB,
    scoreB: candidate.scoreA,
    playerStats: candidate.playerStats.map((p) => ({
      ...p,
      team: p.team === 'A' ? 'B' : 'A',
    })),
  };
}

export class ServiceError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

function findMatch(series: ISeriesDoc, position: number): IMatchDoc {
  const match = series.matches.find((m) => m.position === position);
  if (!match) throw new ServiceError('NOT_FOUND', 'Partida no encontrada en esta serie');
  return match;
}

/** El capitan elige una partida candidata de EA para ocupar un slot vacio */
export async function selectCandidateForMatch(
  seriesId: string,
  position: number,
  requesterUserId: string,
  candidate: IEaCandidateMatch
): Promise<ISeries> {
  const series = await SeriesModel.findById(seriesId);
  if (!series) throw new ServiceError('NOT_FOUND', 'Serie no encontrada');

  const side = await resolveSide(series, requesterUserId); // valida que sea capitan de un lado

  if (series.usedEaMatchIds.includes(candidate.eaMatchId)) {
    throw new ServiceError('ALREADY_USED', 'Esa partida de EA ya se ha usado en otro slot');
  }

  const match = findMatch(series, position);
  if (match.status !== 'sin_seleccionar') {
    throw new ServiceError('ALREADY_SET', 'Este slot ya tiene una partida asignada');
  }

  // La candidata de EA siempre viene con team='A' para el club que la pidio.
  // Si ese capitan es en realidad teamB de la Series, hay que voltear
  // marcador y team de cada jugador antes de guardar.
  const normalized = side === 'A' ? candidate : flipCandidateSides(candidate);

  match.eaMatchId = normalized.eaMatchId;
  match.isManual = false;
  match.original = {
    scoreA: normalized.scoreA,
    scoreB: normalized.scoreB,
    playerStats: normalized.playerStats.map(toPlayerStatDoc),
    fetchedAt: new Date(),
  };
  match.effective = {
    scoreA: normalized.scoreA,
    scoreB: normalized.scoreB,
    playerStats: normalized.playerStats.map(toPlayerStatDoc),
  };
  match.status = 'pendiente_confirmacion';
  series.usedEaMatchIds.push(candidate.eaMatchId);

  await series.save();
  return toISeries(series);
}

/** Cuando no hay ninguna candidata valida en EA, se crea la partida 100% manual */
export async function createManualMatch(
  seriesId: string,
  position: number,
  requesterUserId: string,
  input: { scoreA: number; scoreB: number; playerStats: IMatchPlayerStat[] }
): Promise<ISeries> {
  const series = await SeriesModel.findById(seriesId);
  if (!series) throw new ServiceError('NOT_FOUND', 'Serie no encontrada');

  await resolveSide(series, requesterUserId);

  const match = findMatch(series, position);
  if (match.status !== 'sin_seleccionar') {
    throw new ServiceError('ALREADY_SET', 'Este slot ya tiene una partida asignada');
  }

  match.isManual = true;
  match.eaMatchId = undefined;
  match.original = undefined;
  match.effective = {
    scoreA: input.scoreA,
    scoreB: input.scoreB,
    playerStats: input.playerStats.map((p) => toPlayerStatDoc({ ...p, origin: 'manual' as const })),
  };
  match.status = 'pendiente_confirmacion';

  await series.save();
  return toISeries(series);
}

/** El capitan confirma que el "effective" actual es correcto ("Todo correcto") */
export async function confirmMatch(
  seriesId: string,
  position: number,
  requesterUserId: string
): Promise<ISeries> {
  const series = await SeriesModel.findById(seriesId);
  if (!series) throw new ServiceError('NOT_FOUND', 'Serie no encontrada');

  const side = await resolveSide(series, requesterUserId);
  const match = findMatch(series, position);

  if (match.effective.scoreA == null || match.effective.scoreB == null) {
    throw new ServiceError('NOTHING_TO_CONFIRM', 'Este slot todavia no tiene resultado');
  }

  const confirmation = {
    userId: requesterUserId,
    at: new Date(),
    scoreA: match.effective.scoreA,
    scoreB: match.effective.scoreB,
  };

  if (side === 'A') match.confirmations.byTeamA = confirmation;
  else match.confirmations.byTeamB = confirmation;

  recomputeMatchStatus(match);
  recomputeSeriesStatus(series);

  await series.save();
  return toISeries(series);
}

/** Edicion manual del resultado ("Algo no cuadra"): reabre la confirmacion de ambos lados */
export async function editMatch(
  seriesId: string,
  position: number,
  requesterUserId: string,
  patch: { scoreA: number; scoreB: number; playerStats: IMatchPlayerStat[] },
  changeDescription: string
): Promise<ISeries> {
  const series = await SeriesModel.findById(seriesId);
  if (!series) throw new ServiceError('NOT_FOUND', 'Serie no encontrada');

  await resolveSide(series, requesterUserId);
  const match = findMatch(series, position);

  match.effective = {
    scoreA: patch.scoreA,
    scoreB: patch.scoreB,
    playerStats: patch.playerStats.map(toPlayerStatDoc),
  };
  match.edits.push({ by: requesterUserId, at: new Date(), change: changeDescription });

  // Al editar, se reabre la confirmacion: ambos deben volver a confirmar el nuevo resultado
  match.confirmations = {};
  match.status = 'pendiente_confirmacion';

  recomputeSeriesStatus(series);
  await series.save();
  return toISeries(series);
}

/** Solo admin: fija el resultado definitivo de un match en disputa */
export async function resolveDispute(
  seriesId: string,
  position: number,
  adminUserId: string,
  input: { scoreA: number; scoreB: number; playerStats: IMatchPlayerStat[] }
): Promise<ISeries> {
  const series = await SeriesModel.findById(seriesId);
  if (!series) throw new ServiceError('NOT_FOUND', 'Serie no encontrada');

  const match = findMatch(series, position);
  match.effective = {
    scoreA: input.scoreA,
    scoreB: input.scoreB,
    playerStats: input.playerStats.map(toPlayerStatDoc),
  };
  match.edits.push({
    by: adminUserId,
    at: new Date(),
    change: 'Disputa resuelta manualmente por un admin',
  });
  match.confirmations = {
    byTeamA: { userId: adminUserId, at: new Date(), scoreA: input.scoreA, scoreB: input.scoreB },
    byTeamB: { userId: adminUserId, at: new Date(), scoreA: input.scoreA, scoreB: input.scoreB },
  };
  match.status = 'confirmado';

  recomputeSeriesStatus(series);
  await series.save();
  return toISeries(series);
}

export async function listDisputes() {
  const seriesWithDisputes = await SeriesModel.find({ 'matches.status': 'disputado' })
    .populate('teamA', 'name countryCode')
    .populate('teamB', 'name countryCode');

  return seriesWithDisputes.flatMap((series) =>
    series.matches
      .filter((m) => m.status === 'disputado')
      .map((m) => ({
        seriesId: series._id.toString(),
        teamA: series.teamA,
        teamB: series.teamB,
        round: series.round,
        position: m.position,
        confirmations: m.confirmations,
        effective: m.effective,
      }))
  );
}

function recomputeMatchStatus(match: IMatchDoc): void {
  const { byTeamA, byTeamB } = match.confirmations;
  if (!byTeamA || !byTeamB) return; // sigue pendiente hasta que confirmen los dos

  const coincide = byTeamA.scoreA === byTeamB.scoreA && byTeamA.scoreB === byTeamB.scoreB;
  match.status = coincide ? 'confirmado' : 'disputado';
}

/** Recalcula el estado global de la serie segun cuantos matches estan confirmados */
function recomputeSeriesStatus(series: ISeriesDoc): void {
  const confirmed = series.matches.filter((m) => m.status === 'confirmado');

  if (confirmed.length === 0) {
    series.status = 'pending';
    return;
  }

  const winsNeeded = Math.ceil(series.bestOf / 2);
  const winsA = confirmed.filter(
    (m) => (m.effective.scoreA ?? 0) > (m.effective.scoreB ?? 0)
  ).length;
  const winsB = confirmed.filter(
    (m) => (m.effective.scoreB ?? 0) > (m.effective.scoreA ?? 0)
  ).length;

  series.status = winsA >= winsNeeded || winsB >= winsNeeded ? 'completed' : 'in_progress';
}
