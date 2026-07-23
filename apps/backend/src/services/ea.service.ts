import PQueue from 'p-queue';
import { club, type TPlatformType } from '@trueno-proclub-tourney/eafcapi';
import type { IClubMatches, IMatchClubPlayer, IMatchClub } from '@trueno-proclub-tourney/eafcapi/dist/model/club.js';
import type { IEaCandidateMatch, IMatchPlayer, IMatchTeamData, ITeamMatchStats, PlayerPosition } from '@trueno-proclub-tourney/shared';

const PLATFORM: TPlatformType = 'common-gen5';
const CACHE_TTL_MS = 3 * 60 * 1000;

const eaQueue = new PQueue({ concurrency: 1, interval: 2000, intervalCap: 1 });

interface CacheEntry { value: IEaCandidateMatch[]; expiresAt: number; }
const cache = new Map<string, CacheEntry>();

async function withRetry<T>(fn: () => Promise<T>, retries = 2, baseDelayMs = 1000): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (retries <= 0) throw err;
    const delay = baseDelayMs * 2 ** (2 - retries);
    console.warn(`[ea.service] Reintentando en ${delay}ms...`, err);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return withRetry(fn, retries - 1, baseDelayMs);
  }
}

/** Resuelve el nombre de un club en EA a partir de su clubId. Usa la misma cola/retry que el resto de llamadas a EA. */
export async function getClubName(eaClubId: string): Promise<string | undefined> {
  const info = await eaQueue.add(() =>
    withRetry(() => club.getClubInfo(PLATFORM, Number(eaClubId)))
  );
  return info?.name;
}

/** Busca clubes por nombre en EA, para que el capitán no tenga que saber su eaClubId de memoria. */
export async function searchClubs(query: string): Promise<{ clubId: string; name: string; regionId: number; crestAssetId?: string }[]> {
  const results = await eaQueue.add(() =>
    withRetry(() => club.getClubSearch(PLATFORM, query))
  );
  // getClubSearch esta mal tipado en eafcapi (dice objeto, en realidad es array)
  const list = (results ?? []) as unknown as {
    clubId: string;
    clubInfo: { name: string; regionId: number; customKit?: { crestAssetId?: string } };
  }[];
  return list.map((r) => ({
    clubId: r.clubId,
    name: r.clubInfo.name,
    regionId: r.clubInfo.regionId,
    crestAssetId: r.clubInfo.customKit?.crestAssetId,
  }));
}

export async function listRecentClubMatches(eaClubId: string): Promise<IEaCandidateMatch[]> {
  const key = `club-matches:${eaClubId}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const matches = await eaQueue.add(() =>
    withRetry(() => club.getClubMatchHistory(PLATFORM, Number(eaClubId), 'friendlyMatch' as 'leagueMatch'))
  );

  const candidates = (matches ?? []).map((m) => toCandidateMatch(m, eaClubId));
  cache.set(key, { value: candidates, expiresAt: Date.now() + CACHE_TTL_MS });
  return candidates;
}

function detectDnf(match: IClubMatches, clubIds: string[]): boolean {
  const anyDnfFlag = clubIds.some((id) => match.clubs[id]?.winnerByDnf === '1');
  if (!anyDnfFlag) return false;

  // Heurística: Si EA dice DNF, los goles en 'clubs' suelen ser forzados a 3-0.
  // Si los goles agregados no coinciden, es muy probable que sea un DNF real.
  const forcedResult = clubIds.some((id) => Number(match.clubs[id]?.goals) === 3) &&
    clubIds.some((id) => Number(match.clubs[id]?.goals) === 0);

  const aggregateMismatches = clubIds.some((id) => Number(match.clubs[id]?.goals) !== Number(match.aggregate[id]?.goals));

  return forcedResult && aggregateMismatches;
}

function detectPenalties(match: IClubMatches, clubId: string): { hasPenalties: boolean; penaltiesScore?: number } {
  const goals = Number(match.clubs[clubId]?.goals ?? 0);
  const score = Number(match.clubs[clubId]?.score ?? 0);
  if (score > goals) {
    return { hasPenalties: true, penaltiesScore: score - goals };
  }
  return { hasPenalties: false };
}

function parseTeamStats(aggregate: Record<string, number> | undefined): ITeamMatchStats {
  if (!aggregate) {
    return { goals: 0, shots: 0, passesMade: 0, passesSuccess: 0, tacklesMade: 0, tacklesSuccess: 0, redCards: 0 };
  }
  return {
    goals: Number(aggregate.goals ?? 0),
    shots: Number(aggregate.shots ?? 0),
    passesMade: Number(aggregate.passattempts ?? 0),
    passesSuccess: Number(aggregate.passesmade ?? 0),
    tacklesMade: Number(aggregate.tackleattempts ?? 0),
    tacklesSuccess: Number(aggregate.tacklesmade ?? 0),
    redCards: Number(aggregate.redcards ?? 0),
  };
}

function parseTeamPlayers(players: Record<string, IMatchClubPlayer> | undefined): IMatchPlayer[] {
  if (!players) return [];

  return Object.entries(players).map(([eaId, p]): IMatchPlayer => {
    const raw = p as any;
    return {
      eaId,
      name: p.playername,
      position: (p.pos as PlayerPosition) ?? 'midfielder',
      origin: 'ea',

      rating: Number(p.rating ?? 0),
      secondsPlayed: Number(raw.secondsPlayed ?? 0),
      manOfTheMatch: p.mom === '1',

      goals: Number(p.goals ?? 0),
      assists: Number(p.assists ?? 0),
      shots: Number(p.shots ?? 0),

      goalsConceded: Number(raw.goalsconceded ?? 0),
      redCards: Number(p.redcards ?? 0),
      cleanSheet: raw.cleansheetsany === '1' || raw.cleansheetsgk === '1' || Number(p.goalsconceded ?? 0) === 0,

      passesMade: Number(p.passattempts ?? 0),
      passesSuccess: Number(p.passesmade ?? 0),

      tacklesMade: Number(p.tackleattempts ?? 0),
      tacklesSuccess: Number(p.tacklesmade ?? 0),

      saves: Number(p.saves ?? 0),
      goodDirectionSaves: Number(raw.goodDirectionSaves ?? 0),
      crossSaves: Number(raw.crossSaves ?? 0),
      ballDiveSaves: Number(raw.ballDiveSaves ?? 0),
      parrySaves: Number(raw.parrySaves ?? 0),
      punchSaves: Number(raw.punchSaves ?? 0),
      reflexSaves: Number(raw.reflexSaves ?? 0),
    };
  });
}

function buildMatchTeamData(match: IClubMatches, clubId: string, isDnf: boolean): IMatchTeamData {
  const goalsFromAggregate = Number(match.aggregate?.[clubId]?.goals ?? 0);
  const goalsFromClub = Number(match.clubs[clubId]?.goals ?? 0);

  const score = isDnf ? goalsFromAggregate : goalsFromClub;
  const penalties = detectPenalties(match, clubId);

  return {
    eaClubId: clubId,
    eaClubName: match.clubs[clubId]?.details?.name,
    score,
    penaltiesScore: penalties.hasPenalties ? penalties.penaltiesScore : undefined,
    stats: parseTeamStats(match.aggregate?.[clubId]),
    players: parseTeamPlayers(match.players?.[clubId]),
  };
}

function toCandidateMatch(match: IClubMatches, ourClubId: string): IEaCandidateMatch {
  const clubIds = Object.keys(match.clubs);
  const opponentClubId = clubIds.find((id) => id !== ourClubId) ?? clubIds[1];

  const winnerByDnf = detectDnf(match, clubIds);
  const penaltiesOur = detectPenalties(match, ourClubId);
  const penaltiesOpp = detectPenalties(match, opponentClubId);
  const winnerByPen = penaltiesOur.hasPenalties || penaltiesOpp.hasPenalties;

  return {
    eaMatchId: match.matchId,
    playedAt: new Date(match.timestamp * 1000).toISOString(),
    winnerByDnf,
    winnerByPen,
    teamA: buildMatchTeamData(match, ourClubId, winnerByDnf),
    teamB: buildMatchTeamData(match, opponentClubId, winnerByDnf),
  };
}
