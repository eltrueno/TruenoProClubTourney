import PQueue from 'p-queue';
import { club, type TPlatformType } from '@trueno-proclub-services/eafcapi';
import type { IClubMatches, IMatchClubPlayer } from '@trueno-proclub-services/eafcapi/dist/model/club.js';
import type { IEaCandidateMatch, IMatchPlayerStat } from '@trueno-pro-club-tourney/shared';

const PLATFORM: TPlatformType = 'common-gen5';
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutos: suficiente para no repetir si dos capitanes miran a la vez

/**
 * Cola propia hacia EA: fuerza como mucho 1 peticion cada 2s, pase lo que
 * pase con cuantos capitanes pulsen "Añadir partido" a la vez. Esto es lo
 * que de verdad evita los picos que suelen disparar bloqueos, mas que
 * cambiar desde donde sale la peticion.
 */
const eaQueue = new PQueue({ concurrency: 1, interval: 2000, intervalCap: 1 });

interface CacheEntry {
  value: IEaCandidateMatch[];
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

function cacheKey(eaClubId: string): string {
  return `club-matches:${eaClubId}`;
}

/**
 * Reintenta con backoff exponencial si EA responde mal (429, timeouts del
 * navegador headless, etc.), en vez de martillear.
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 2, baseDelayMs = 1000): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (retries <= 0) throw err;
    const delay = baseDelayMs * 2 ** (2 - retries);
    console.warn(`[ea.service] Fallo llamando a EA, reintentando en ${delay}ms...`, err);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return withRetry(fn, retries - 1, baseDelayMs);
  }
}

/**
 * Lista los partidos recientes jugados por este club, para que el capitan
 * elija cual usar en un slot vacio de una Series.
 *
 * Los goles/jugadores se devuelven con team='A' para EL CLUB SOLICITADO
 * (eaClubId) y team='B' para el rival. series.service normaliza esto segun
 * si el capitan que reporta es teamA o teamB de la Series real.
 */
export async function listRecentClubMatches(eaClubId: string): Promise<IEaCandidateMatch[]> {
  const cached = cache.get(cacheKey(eaClubId));
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const matches = await eaQueue.add(() =>
    // El tipo TGametype de eafcapi solo declara 'leagueMatch' | 'playoffMatch',
    // pero la API de EA si admite 'friendlyMatch' de verdad (igual que en el
    // resto de servicios de TruenoProClubServices, que tambien lo castean).
    withRetry(() => club.getClubMatchHistory(PLATFORM, Number(eaClubId), 'friendlyMatch' as 'leagueMatch'))
  );

  const candidates = (matches ?? []).map((m) => toCandidateMatch(m, eaClubId));

  cache.set(cacheKey(eaClubId), { value: candidates, expiresAt: Date.now() + CACHE_TTL_MS });
  return candidates;
}

function toCandidateMatch(match: IClubMatches, ourClubId: string): IEaCandidateMatch {
  const clubIds = Object.keys(match.clubs);
  const opponentClubId = clubIds.find((id) => id !== ourClubId) ?? clubIds[1];

  const ourClub = match.clubs[ourClubId];
  const opponentClub = match.clubs[opponentClubId];

  const playerStats: IMatchPlayerStat[] = [
    ...mapPlayers(match.players[ourClubId], 'A'),
    ...mapPlayers(match.players[opponentClubId], 'B'),
  ];

  return {
    eaMatchId: match.matchId,
    playedAt: new Date(match.timestamp * 1000).toISOString(),
    scoreA: Number(ourClub?.goals ?? 0),
    scoreB: Number(opponentClub?.goals ?? 0),
    playerStats,
  };
}

function mapPlayers(
  players: Record<string, IMatchClubPlayer> | undefined,
  team: 'A' | 'B'
): IMatchPlayerStat[] {
  if (!players) return [];

  return Object.entries(players).map(([eaPlayerId, p]) => ({
    eaPlayerId,
    playerName: p.playername,
    team,
    goals: Number(p.goals ?? 0),
    origin: 'ea' as const,
  }));
}
