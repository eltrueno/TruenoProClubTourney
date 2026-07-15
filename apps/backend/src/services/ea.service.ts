import PQueue from 'p-queue';
import { club, type TPlatformType } from '@trueno-proclub-services/eafcapi';
import type { IClubMatches, IMatchClubPlayer } from '@trueno-proclub-services/eafcapi/dist/model/club.js';
import type { IEaCandidateMatch, IMatchPlayerStat, PlayerPosition } from '@trueno-pro-club-tourney/shared';

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

function toCandidateMatch(match: IClubMatches, ourClubId: string): IEaCandidateMatch {
  const clubIds = Object.keys(match.clubs);
  const opponentClubId = clubIds.find((id) => id !== ourClubId) ?? clubIds[1];

  return {
    eaMatchId: match.matchId,
    playedAt: new Date(match.timestamp * 1000).toISOString(),
    scoreA: Number(match.clubs[ourClubId]?.goals ?? 0),
    scoreB: Number(match.clubs[opponentClubId]?.goals ?? 0),
    playerStats: [
      ...mapPlayers(match.players[ourClubId], 'A'),
      ...mapPlayers(match.players[opponentClubId], 'B'),
    ],
  };
}

function mapPlayers(
  players: Record<string, IMatchClubPlayer> | undefined,
  team: 'A' | 'B'
): IMatchPlayerStat[] {
  if (!players) return [];

  // Los campos no tipados en IMatchClubPlayer se leen via `raw`
  return Object.entries(players).map(([eaPlayerId, p]): IMatchPlayerStat => {
    const raw = p as any;
    return {
      eaPlayerId,                          // ID numerico de EA, la clave del mapa players[clubId]
      playerName: p.playername,
      team,
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
      cleanSheet: raw.cleansheetsany === '1' || raw.cleansheetsgk === '1',

      passesMade: Number(p.passesmade ?? 0),
      passesSuccess: Number(p.passattempts ?? 0) > 0
        ? Math.round((Number(p.passesmade ?? 0) / Number(p.passattempts ?? 1)) * 100)
        : 0,

      tacklesMade: Number(p.tacklesmade ?? 0),
      tacklesSuccess: Number(p.tackleattempts ?? 0) > 0
        ? Math.round((Number(p.tacklesmade ?? 0) / Number(p.tackleattempts ?? 1)) * 100)
        : 0,

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
