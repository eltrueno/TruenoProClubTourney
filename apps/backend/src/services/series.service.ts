import type {
  ISeries,
  IMatch,
  IMatchPlayer,
  IEaCandidateMatch,
  IMatchTeamData,
} from '@trueno-proclub-tourney/shared';
import { SeriesModel, type ISeriesDoc, type IMatchDoc, type IMatchPlayerDoc, type IMatchTeamDataDoc } from '../models/Series.model.js';
import { getTeamIdForCaptain } from './captain.service.js';

function toIMatch(doc: IMatchDoc): IMatch {
  return JSON.parse(JSON.stringify(doc)); // subdocumento plano, basta serializar
}

function toMatchPlayerDoc(stat: IMatchPlayer, origin: 'ea' | 'manual' = 'ea'): IMatchPlayerDoc {
  return {
    eaId: stat.eaId,
    name: stat.name,
    position: stat.position,
    origin: stat.origin ?? origin,
    rating: stat.rating,
    secondsPlayed: stat.secondsPlayed,
    manOfTheMatch: stat.manOfTheMatch,
    goals: stat.goals,
    assists: stat.assists,
    shots: stat.shots,
    goalsConceded: stat.goalsConceded,
    redCards: stat.redCards,
    cleanSheet: stat.cleanSheet,
    passesMade: stat.passesMade,
    passesSuccess: stat.passesSuccess,
    tacklesMade: stat.tacklesMade,
    tacklesSuccess: stat.tacklesSuccess,
    saves: stat.saves,
    goodDirectionSaves: stat.goodDirectionSaves,
    crossSaves: stat.crossSaves,
    ballDiveSaves: stat.ballDiveSaves,
    parrySaves: stat.parrySaves,
    punchSaves: stat.punchSaves,
    reflexSaves: stat.reflexSaves,
    editedBy: stat.editedBy,
    editedAt: stat.editedAt ? new Date(stat.editedAt) : undefined,
  };
}

function toMatchTeamDataDoc(data: IMatchTeamData, origin: 'ea' | 'manual' = 'ea'): IMatchTeamDataDoc {
  return {
    eaClubId: data.eaClubId,
    eaClubName: data.eaClubName,
    score: data.score,
    penaltiesScore: data.penaltiesScore,
    stats: { ...data.stats },
    players: data.players.map((p) => toMatchPlayerDoc(p, origin)),
  };
}

function toISeries(doc: ISeriesDoc): ISeries {
  return {
    id: doc._id.toString(),
    teamA: doc.teamA ? (doc.populated('teamA') ? (doc.teamA as any) : doc.teamA.toString()) : null,
    teamB: doc.teamB ? (doc.populated('teamB') ? (doc.teamB as any) : doc.teamB.toString()) : null,
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
export async function listSeriesForCaptain(userId: string): Promise<import('@trueno-proclub-tourney/shared').IMySeriesResponse[]> {
  const teamId = await getTeamIdForCaptain(userId);
  if (!teamId) return [];

  const docs = await SeriesModel.find({
    $or: [{ teamA: teamId }, { teamB: teamId }],
    status: { $ne: 'completed' },
  })
    .sort({ round: 1, createdAt: 1 })
    .populate('teamA teamB');

  return docs.map((doc) => {
    const s = toISeries(doc);
    return {
      ...s,
      mySide: idOf(doc.teamA) === teamId ? 'A' : 'B',
    };
  });
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
    status: 'unselected',
    isManual: false,
    effective: { teamA: null, teamB: null } as any,
    edits: [],
    confirmations: {},
  }));

  const doc = await SeriesModel.create({ ...input, matches, usedEaMatchIds: [] });
  return toISeries(doc);
}

/** Extrae el id de un campo que puede venir como ObjectId sin poblar o como documento poblado */
function idOf(value: any): string | null {
  if (!value) return null;
  return (value._id ?? value).toString();
}

/** Determina si requesterUserId es capitan de teamA o teamB de esta serie */
async function resolveSide(
  series: ISeriesDoc,
  requesterUserId: string
): Promise<'A' | 'B'> {
  const teamId = await getTeamIdForCaptain(requesterUserId);
  if (!teamId) throw new ServiceError('NOT_A_CAPTAIN', 'No eres capitan de ningun equipo');

  if (idOf(series.teamA) === teamId) return 'A';
  if (idOf(series.teamB) === teamId) return 'B';

  throw new ServiceError('FORBIDDEN', 'No eres capitan de ninguno de los dos equipos de esta serie');
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

/** If EA_VALIDATE_OPPONENT is 'false' the validation of EA's opponent matching the series' opponent is disabled (useful in local/testing) */
const VALIDATE_OPPONENT = process.env.EA_VALIDATE_OPPONENT !== 'false';

/**
 * Determines the teamA/teamB order of the candidate according to the expected eaClubIds
 * in the series, flipping if they come in reverse order. If it doesn't match either side,
 * throws INVALID_OPPONENT (unless validation is disabled).
 */
function resolveCandidateSides(
  candidate: IEaCandidateMatch,
  eaTeamA: string | undefined,
  eaTeamB: string | undefined
): { teamA: IMatchTeamData; teamB: IMatchTeamData } {
  const isDirectOrder = candidate.teamA.eaClubId === eaTeamA && candidate.teamB.eaClubId === eaTeamB;
  const isSwappedOrder = candidate.teamA.eaClubId === eaTeamB && candidate.teamB.eaClubId === eaTeamA;

  if (isSwappedOrder) {
    return { teamA: candidate.teamB, teamB: candidate.teamA };
  }

  if (!isDirectOrder && VALIDATE_OPPONENT) {
    throw new ServiceError('INVALID_OPPONENT', 'El partido de EA no se jugó contra el rival asignado en esta serie.');
  }

  return { teamA: candidate.teamA, teamB: candidate.teamB };
}

/** El capitan elige una partida candidata de EA para ocupar un slot vacio */
export async function selectCandidateForMatch(
  seriesId: string,
  position: number,
  requesterUserId: string,
  candidate: IEaCandidateMatch
): Promise<ISeries> {
  const series = await SeriesModel.findById(seriesId).populate<{ teamA: any; teamB: any }>('teamA teamB');
  if (!series) throw new ServiceError('NOT_FOUND', 'Serie no encontrada');

  await resolveSide(series, requesterUserId); // valida que sea capitan de un lado

  if (series.usedEaMatchIds.includes(candidate.eaMatchId)) {
    throw new ServiceError('ALREADY_USED', 'Esa partida de EA ya se ha usado en otro slot');
  }

  const match = findMatch(series, position);
  if (match.status !== 'unselected') {
    throw new ServiceError('ALREADY_SET', 'Este slot ya tiene una partida asignada');
  }

  const eaTeamA = series.teamA?.eaClubId;
  const eaTeamB = series.teamB?.eaClubId;

  const { teamA: finalTeamA, teamB: finalTeamB } = resolveCandidateSides(candidate, eaTeamA, eaTeamB);

  match.eaMatchId = candidate.eaMatchId;
  match.isManual = false;
  match.winnerByDnf = candidate.winnerByDnf;
  match.winnerByPen = candidate.winnerByPen;
  match.original = {
    teamA: toMatchTeamDataDoc(finalTeamA),
    teamB: toMatchTeamDataDoc(finalTeamB),
    fetchedAt: new Date(),
  };
  match.effective = {
    teamA: toMatchTeamDataDoc(finalTeamA),
    teamB: toMatchTeamDataDoc(finalTeamB),
  };
  match.status = 'pending_confirmation';
  series.usedEaMatchIds.push(candidate.eaMatchId);

  await series.save();
  return toISeries(series);
}

/** Cuando no hay ninguna candidata valida en EA, se crea la partida 100% manual */
export async function createManualMatch(
  seriesId: string,
  position: number,
  requesterUserId: string,
  input: { teamA: IMatchTeamData; teamB: IMatchTeamData }
): Promise<ISeries> {
  const series = await SeriesModel.findById(seriesId).populate('teamA teamB');
  if (!series) throw new ServiceError('NOT_FOUND', 'Serie no encontrada');

  await resolveSide(series, requesterUserId);

  const match = findMatch(series, position);
  if (match.status !== 'unselected') {
    throw new ServiceError('ALREADY_SET', 'Este slot ya tiene una partida asignada');
  }

  match.isManual = true;
  match.eaMatchId = undefined;
  match.original = undefined;
  match.effective = {
    teamA: toMatchTeamDataDoc(input.teamA, 'manual'),
    teamB: toMatchTeamDataDoc(input.teamB, 'manual'),
  };
  match.status = 'pending_confirmation';

  await series.save();
  return toISeries(series);
}

/** El capitan confirma que el "effective" actual es correcto ("Todo correcto") */
export async function confirmMatch(
  seriesId: string,
  position: number,
  requesterUserId: string
): Promise<ISeries> {
  const series = await SeriesModel.findById(seriesId).populate('teamA teamB');
  if (!series) throw new ServiceError('NOT_FOUND', 'Serie no encontrada');

  const side = await resolveSide(series, requesterUserId);
  const match = findMatch(series, position);

  if (!match.effective.teamA || !match.effective.teamB || match.effective.teamA.score == null || match.effective.teamB.score == null) {
    throw new ServiceError('NOTHING_TO_CONFIRM', 'Este slot todavia no tiene resultado');
  }

  const confirmation = {
    userId: requesterUserId,
    at: new Date(),
    teamA: { score: match.effective.teamA.score, penaltiesScore: match.effective.teamA.penaltiesScore ?? undefined },
    teamB: { score: match.effective.teamB.score, penaltiesScore: match.effective.teamB.penaltiesScore ?? undefined },
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
  patch: { teamA: { score: number; penaltiesScore?: number | null }; teamB: { score: number; penaltiesScore?: number | null } },
  changeDescription: string
): Promise<ISeries> {
  const series = await SeriesModel.findById(seriesId).populate('teamA teamB');
  if (!series) throw new ServiceError('NOT_FOUND', 'Serie no encontrada');

  await resolveSide(series, requesterUserId);
  const match = findMatch(series, position);

  if (match.effective.teamA) {
    match.effective.teamA.score = patch.teamA.score;
    match.effective.teamA.penaltiesScore = patch.teamA.penaltiesScore ?? null;
  }
  if (match.effective.teamB) {
    match.effective.teamB.score = patch.teamB.score;
    match.effective.teamB.penaltiesScore = patch.teamB.penaltiesScore ?? null;
  }

  match.edits.push({ by: requesterUserId, at: new Date(), change: changeDescription });

  // Al editar, se reabre la confirmacion: ambos deben volver a confirmar el nuevo resultado
  match.confirmations = {};
  match.status = 'pending_confirmation';

  recomputeSeriesStatus(series);
  await series.save();
  return toISeries(series);
}

/** Solo admin: fija el resultado definitivo de un match en disputa */
export async function resolveDispute(
  seriesId: string,
  position: number,
  adminUserId: string,
  input: { teamA: { score: number; penaltiesScore?: number | null }; teamB: { score: number; penaltiesScore?: number | null } }
): Promise<ISeries> {
  const series = await SeriesModel.findById(seriesId).populate('teamA teamB');
  if (!series) throw new ServiceError('NOT_FOUND', 'Serie no encontrada');

  const match = findMatch(series, position);

  if (match.effective.teamA) {
    match.effective.teamA.score = input.teamA.score;
    match.effective.teamA.penaltiesScore = input.teamA.penaltiesScore ?? null;
  }
  if (match.effective.teamB) {
    match.effective.teamB.score = input.teamB.score;
    match.effective.teamB.penaltiesScore = input.teamB.penaltiesScore ?? null;
  }

  match.edits.push({
    by: adminUserId,
    at: new Date(),
    change: 'Disputa resuelta manualmente por un admin',
  });
  match.confirmations = {
    byTeamA: { userId: adminUserId, at: new Date(), teamA: { score: input.teamA.score ?? 0, penaltiesScore: input.teamA.penaltiesScore ?? undefined }, teamB: { score: input.teamB.score ?? 0, penaltiesScore: input.teamB.penaltiesScore ?? undefined } },
    byTeamB: { userId: adminUserId, at: new Date(), teamA: { score: input.teamA.score ?? 0, penaltiesScore: input.teamA.penaltiesScore ?? undefined }, teamB: { score: input.teamB.score ?? 0, penaltiesScore: input.teamB.penaltiesScore ?? undefined } },
  };
  match.status = 'confirmed';

  recomputeSeriesStatus(series);
  await series.save();
  return toISeries(series);
}

export async function listDisputes() {
  const seriesWithDisputes = await SeriesModel.find({ 'matches.status': 'disputed' })
    .populate('teamA', 'name countryCode')
    .populate('teamB', 'name countryCode');

  return seriesWithDisputes.flatMap((series) =>
    series.matches
      .filter((m) => m.status === 'disputed')
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
  if (!byTeamA?.userId || !byTeamB?.userId) return; // sigue pendiente hasta que confirmen los dos de verdad

  const coincide =
    byTeamA.teamA.score === byTeamB.teamA.score &&
    byTeamA.teamA.penaltiesScore === byTeamB.teamA.penaltiesScore &&
    byTeamA.teamB.score === byTeamB.teamB.score &&
    byTeamA.teamB.penaltiesScore === byTeamB.teamB.penaltiesScore;

  match.status = coincide ? 'confirmed' : 'disputed';
}

/** Recalcula el estado global de la serie segun cuantos matches estan confirmados */
function recomputeSeriesStatus(series: ISeriesDoc): void {
  const confirmed = series.matches.filter((m) => m.status === 'confirmed');

  if (confirmed.length === 0) {
    series.status = 'pending';
    return;
  }

  const winsNeeded = Math.ceil(series.bestOf / 2);
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

  series.status = winsA >= winsNeeded || winsB >= winsNeeded ? 'completed' : 'in_progress';
}
