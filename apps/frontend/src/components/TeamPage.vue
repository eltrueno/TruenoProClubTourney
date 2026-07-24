<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import type { ISeries, ITeam, IGroupStanding, IPlayerAggregateStats } from '@trueno-proclub-tourney/shared';
import TeamLogo from '@/components/ui/TeamLogo.vue';
import PlayerCard from '@/components/ui/PlayerCard.vue';
import type { PlayerCardStat } from '@/components/ui/PlayerCard.vue';
import { api, teamBadge } from '../lib/api';
import { translateApiError } from '../i18n/translations';
import AppError from './ui/Error.vue';
import Loader from '@/components/layout/Loader.vue';

import ball from "@/assets/icons/ball.svg?component";
import highfive from "@/assets/icons/highfive.svg?component";
import star from "@/assets/icons/star.svg?component";
import copyright from "@/assets/icons/copyright.svg?component";

const teamId = ref<string | null>(null);
const team = ref<ITeam | null>(null);
const allSeries = ref<ISeries[]>([]);
const teams = ref<Record<string, ITeam>>({});
const standings = ref<IGroupStanding[]>([]);
const allPlayerStats = ref<IPlayerAggregateStats[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const tab = ref<'resumen' | 'plantilla'>('resumen');

type TeamRef = string | ITeam | null;

onMounted(async () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) {
    error.value = 'Falta el id del equipo en la URL (?id=...)';
    loading.value = false;
    return;
  }
  teamId.value = id;

  try {
    const [t, s, allTeams, players] = await Promise.all([
      api.teams.getById(id),
      api.series.getAll(id),
      api.teams.getAll(),
      api.playerStats.getAll(),
    ]);
    team.value = t;
    allSeries.value = s;
    teams.value = Object.fromEntries(allTeams.map((x) => [x.id, x]));
    allPlayerStats.value = players;

    // Si juega fase de grupos, cargamos su tabla de clasificación para dar contexto
    const groupSeries = s.find((x) => x.stageType === 'groups');
    if (groupSeries) {
      const byGroup = await api.series.getStandings(groupSeries.stageId);
      standings.value = byGroup[groupSeries.group ?? ''] ?? [];
    }
  } catch (e) {
    error.value = translateApiError(e);
  } finally {
    loading.value = false;
  }
});

const mySeries = computed(() => allSeries.value);
const pendingSeries = computed(() => mySeries.value.filter((s) => s.status !== 'completed'));
const playedSeries = computed(() => mySeries.value.filter((s) => s.status === 'completed'));

function resolveTeam(t: TeamRef): ITeam | undefined {
  if (!t) return undefined;
  return typeof t === 'string' ? teams.value[t] : t;
}

function getTeamId(t: TeamRef): string | null {
  if (!t) return null;
  return typeof t === 'string' ? t : t.id;
}

function rival(s: ISeries): TeamRef {
  return getTeamId(s.teamA) === teamId.value ? s.teamB : s.teamA;
}

function rivalName(s: ISeries) {
  return resolveTeam(rival(s))?.name ?? 'Por determinar';
}

function rivalBadge(s: ISeries) {
  return teamBadge(resolveTeam(rival(s)));
}

function seriesWins(s: ISeries): [number, number] {
  const confirmed = s.matches.filter((m) => m.status === 'confirmed');
  let wA = 0, wB = 0;
  for (const m of confirmed) {
    const sA = m.effective.teamA?.score ?? 0, sB = m.effective.teamB?.score ?? 0;
    const pA = m.effective.teamA?.penaltiesScore ?? 0, pB = m.effective.teamB?.penaltiesScore ?? 0;
    if (sA > sB || (sA === sB && pA > pB)) wA++; else wB++;
  }
  return [wA, wB];
}

/**
 * En series al mejor de 1, mostrar el marcador como "victorias de la serie" (siempre 1-0)
 * oculta el resultado real. Ahí mostramos los goles del único partido; en bo3 sí tiene
 * sentido mostrar el cómputo de partidas ganadas.
 */
function myScore(s: ISeries) {
  const isA = getTeamId(s.teamA) === teamId.value;
  if (s.bestOf === 1) {
    const m = s.matches.find((x) => x.status === 'confirmed');
    if (!m) return '–';
    const my = isA ? m.effective.teamA : m.effective.teamB;
    const their = isA ? m.effective.teamB : m.effective.teamA;
    return `${my?.score ?? 0} – ${their?.score ?? 0}`;
  }
  const [wA, wB] = seriesWins(s);
  return isA ? `${wA} – ${wB}` : `${wB} – ${wA}`;
}

function mySeriesResult(s: ISeries): 'win' | 'loss' | 'draw' {
  const isA = getTeamId(s.teamA) === teamId.value;
  const [wA, wB] = seriesWins(s);
  const my = isA ? wA : wB;
  const their = isA ? wB : wA;
  return my > their ? 'win' : my < their ? 'loss' : 'draw';
}

/** Cada match confirmado, en orden cronológico descendente, con el resultado desde la perspectiva de este equipo */
const recentMatches = computed(() => {
  type Row = { at: number; result: 'win' | 'loss' | 'draw'; myGoals: number; theirGoals: number; rivalName: string; seriesId: string };
  const rows: Row[] = [];

  for (const s of playedSeries.value) {
    const isA = getTeamId(s.teamA) === teamId.value;
    for (const m of s.matches) {
      if (m.status !== 'confirmed') continue;
      const my = isA ? m.effective.teamA : m.effective.teamB;
      const their = isA ? m.effective.teamB : m.effective.teamA;
      if (my?.score == null || their?.score == null) continue;
      const myPen = my.penaltiesScore ?? 0, theirPen = their.penaltiesScore ?? 0;
      const result: Row['result'] =
        my.score > their.score || (my.score === their.score && myPen > theirPen) ? 'win' :
        my.score < their.score || (my.score === their.score && myPen < theirPen) ? 'loss' : 'draw';
      const at = m.original?.fetchedAt ? new Date(m.original.fetchedAt).getTime() : new Date(s.createdAt).getTime();
      rows.push({ at, result, myGoals: my.score, theirGoals: their.score, rivalName: rivalName(s), seriesId: s.id });
    }
  }

  return rows.sort((a, b) => b.at - a.at);
});

const form = computed(() => recentMatches.value.slice(0, 5).reverse());

const teamStats = computed(() => {
  let goalsFor = 0, goalsAgainst = 0, wins = 0, losses = 0, ties = 0, cleanSheets = 0;

  for (const row of recentMatches.value) {
    goalsFor += row.myGoals;
    goalsAgainst += row.theirGoals;
    if (row.result === 'win') wins++;
    else if (row.result === 'loss') losses++;
    else ties++;
    if (row.theirGoals === 0) cleanSheets++;
  }

  const matchesPlayed = wins + losses + ties;
  return {
    goalsFor, goalsAgainst, wins, losses, ties, matchesPlayed, cleanSheets,
    points: wins * 3 + ties,
    goalDiff: goalsFor - goalsAgainst,
  };
});

const groupPosition = computed(() => {
  if (!standings.value.length || !teamId.value) return null;
  const idx = standings.value.findIndex((r) => r.teamId === teamId.value);
  return idx === -1 ? null : { position: idx + 1, total: standings.value.length, row: standings.value[idx] };
});

/** eaId de todos los jugadores vistos en algún match confirmado de este equipo */
const myPlayerIds = computed(() => {
  const ids = new Set<string>();
  for (const s of playedSeries.value) {
    const isA = getTeamId(s.teamA) === teamId.value;
    for (const m of s.matches) {
      if (m.status !== 'confirmed') continue;
      const players = isA ? m.effective.teamA?.players : m.effective.teamB?.players;
      players?.forEach((p) => ids.add(p.eaId));
    }
  }
  return ids;
});

/** Cruce con la colección global de stats agregadas: mucho más rico que recalcular a mano */
const squad = computed(() =>
  allPlayerStats.value
    .filter((p) => myPlayerIds.value.has(p.eaPlayerId))
    .sort((a, b) => b.goals - a.goals || b.avgRating - a.avgRating)
);

const topScorer = computed(() => squad.value[0] ?? null);
const topRated = computed(() => [...squad.value].sort((a, b) => b.avgRating - a.avgRating)[0] ?? null);
const topAssister = computed(() => [...squad.value].sort((a, b) => b.assists - a.assists)[0] ?? null);

/** Posición en la que más ha jugado el jugador, según las apariciones acumuladas */
function mainPosition(p: IPlayerAggregateStats): string {
  const entries = Object.entries(p.positionsPlayed ?? {});
  if (!entries.length) return 'unknown';
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

function squadCardStats(p: IPlayerAggregateStats): PlayerCardStat[] {
  if (mainPosition(p) === 'goalkeeper') {
    return [
      { label: 'PJ', value: p.matchesPlayed },
      { label: 'Paradas', value: p.saves },
      { label: 'Encajados', value: p.goalsConceded },
      { label: 'P. a 0', value: p.cleanSheets, emphasis: true },
    ];
  }
  return [
    { label: 'PJ', value: p.matchesPlayed },
    { label: 'Goles', value: p.goals, emphasis: true },
    { label: 'Asist.', value: p.assists },
    { label: 'P. pase', value: `${p.passAccuracy}%` },
  ];
}

const positionGroupLabel: Record<string, string> = {
  goalkeeper: 'Porteros',
  defender: 'Defensas',
  midfielder: 'Centrocampistas',
  forward: 'Delanteros',
  unknown: 'Otros',
};
const positionOrder = ['goalkeeper', 'defender', 'midfielder', 'forward', 'unknown'];

const positionGroups = computed(() => {
  const groups: Record<string, IPlayerAggregateStats[]> = {};
  for (const p of squad.value) {
    const pos = mainPosition(p);
    (groups[pos] ??= []).push(p);
  }
  return positionOrder
    .filter((key) => groups[key]?.length)
    .map((key) => ({ key, label: positionGroupLabel[key], players: groups[key] }));
});

const resultBadge: Record<'win' | 'loss' | 'draw', string> = {
  win: 'bg-success text-success-content',
  loss: 'bg-error text-error-content',
  draw: 'bg-base-300',
};
const resultLabel: Record<'win' | 'loss' | 'draw', string> = { win: 'V', loss: 'D', draw: 'E' };

</script>

<template>
  <div>
    <div v-if="loading" class="flex justify-center py-20">
      <Loader />
    </div>

    <AppError v-else-if="error || !team" :error="error ?? 'Equipo no encontrado'" />

    <div v-else class="space-y-6">
      <!-- Cabecera del equipo -->
      <div class="card-gold p-6 space-y-5">
        <div class="flex flex-wrap items-center gap-5 justify-center md:justify-between">
          <TeamLogo size="xl" :url="teamBadge(team)"/>
          <div class="justify-self-start md:flex-1">
            <h1 class="text-2xl md:text-3xl font-black truncate text-center md:text-start">{{ team.name }}</h1>
            <p v-if="team.captainName" class="text-sm opacity-60 flex items-center gap-1 justify-center md:justify-start">
              <copyright class="size-5" />
              {{ team.captainName }}
            </p>
            <div class="flex flex-wrap items-center gap-2 mt-2 justify-center md:justify-start">
              <span v-if="team.group" class="badge badge-outline">Grupo {{ team.group }}</span>
              <span v-if="groupPosition" class="badge" :class="groupPosition.position <= 2 ? 'badge-success' : 'badge-ghost'">
                {{ groupPosition.position }}º de {{ groupPosition.total }} · {{ groupPosition.row.points }} pts
              </span>
            </div>
          </div>

          <!-- Forma reciente -->
          <div v-if="form.length" class="flex flex-col items-center gap-1 justify-self-center">
            <span class="text-[10px] uppercase font-bold opacity-40">Últimos partidos</span>
            <div class="flex gap-1 justify-center md:justify-start">
              <a
                v-for="(r, i) in form" :key="i"
                :href="`/series?id=${r.seriesId}`"
                class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black hover:scale-110 transition-transform"
                :class="resultBadge[r.result]"
                :title="`${r.result === 'win' ? 'Victoria' : r.result === 'loss' ? 'Derrota' : 'Empate'} ${r.myGoals}-${r.theirGoals} vs ${r.rivalName}`"
              >
                {{ resultLabel[r.result] }}
              </a>
            </div>
          </div>
        </div>

        <!-- Stats grid -->
        <div class="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          <div class="text-center px-2 py-3 bg-base-200 rounded-xl">
            <div class="text-xl font-black">{{ teamStats.matchesPlayed }}</div>
            <div class="text-[10px] uppercase font-bold opacity-60">Partidos</div>
          </div>
          <div class="text-center px-2 py-3 bg-base-200 rounded-xl">
            <div class="text-xl font-black text-success">{{ teamStats.wins }}</div>
            <div class="text-[10px] uppercase font-bold opacity-60">Victorias</div>
          </div>
          <div class="text-center px-2 py-3 bg-base-200 rounded-xl">
            <div class="text-xl font-black opacity-70">{{ teamStats.ties }}</div>
            <div class="text-[10px] uppercase font-bold opacity-60">Empates</div>
          </div>
          <div class="text-center px-2 py-3 bg-base-200 rounded-xl">
            <div class="text-xl font-black text-error">{{ teamStats.losses }}</div>
            <div class="text-[10px] uppercase font-bold opacity-60">Derrotas</div>
          </div>
          <div class="text-center px-2 py-3 bg-base-200 rounded-xl">
            <div class="text-xl font-black">
              <span class="text-success">{{ teamStats.goalsFor }}</span><span class="opacity-30 mx-0.5">-</span><span class="text-error">{{ teamStats.goalsAgainst }}</span>
            </div>
            <div class="text-[10px] uppercase font-bold opacity-60">Goles</div>
          </div>
          <div class="text-center px-2 py-3 bg-base-200 rounded-xl">
            <div class="text-xl font-black" :class="teamStats.goalDiff > 0 ? 'text-success' : teamStats.goalDiff < 0 ? 'text-error' : ''">
              {{ teamStats.goalDiff > 0 ? '+' : '' }}{{ teamStats.goalDiff }}
            </div>
            <div class="text-[10px] uppercase font-bold opacity-60">Dif. goles</div>
          </div>
          <div class="text-center px-2 py-3 bg-base-200 rounded-xl">
            <div class="text-xl font-black">{{ teamStats.cleanSheets }}</div>
            <div class="text-[10px] uppercase font-bold opacity-60">Portería a 0</div>
          </div>
        </div>

        <!-- Destacados -->
        <div v-if="squad.length" class="grid md:grid-cols-3 gap-3 pt-1 justify-center md:justify-start">
          <a v-if="topScorer" :href="`/jugador?id=${topScorer.eaPlayerId}`" class="flex items-center gap-3 bg-base-200 hover:bg-base-300 transition-colors rounded-xl px-4 py-3">
            <ball class="size-6 text-primary"></ball>
            <div class="min-w-0">
              <div class="text-[10px] uppercase font-bold opacity-50">Máximo goleador</div>
              <div class="font-bold truncate">{{ topScorer.playerName }} <span class="opacity-50 font-normal">· {{ topScorer.goals }} goles</span></div>
            </div>
          </a>
          <a v-if="topAssister" :href="`/jugador?id=${topAssister.eaPlayerId}`" class="flex items-center gap-3 bg-base-200 hover:bg-base-300 transition-colors rounded-xl px-4 py-3">
            <highfive class="size-6 text-primary"></highfive>
            <div class="min-w-0">
              <div class="text-[10px] uppercase font-bold opacity-50">Máximo asistente</div>
              <div class="font-bold truncate">{{ topAssister.playerName }} <span class="opacity-50 font-normal">· {{ topAssister.assists }} asistencias</span></div>
            </div>
          </a>
          <a v-if="topRated" :href="`/jugador?id=${topRated.eaPlayerId}`" class="flex items-center gap-3 bg-base-200 hover:bg-base-300 transition-colors rounded-xl px-4 py-3">
            <star class="size-7 text-primary"></star>
            <div class="min-w-0">
              <div class="text-[10px] uppercase font-bold opacity-50">Mejor valorado</div>
              <div class="font-bold truncate">{{ topRated.playerName }} <span class="opacity-50 font-normal">· {{ topRated.avgRating.toFixed(1) }}</span></div>
            </div>
          </a>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs tabs-boxed w-fit">
        <a class="tab" :class="{ 'tab-active': tab === 'resumen' }" @click="tab = 'resumen'">Calendario</a>
        <a class="tab" :class="{ 'tab-active': tab === 'plantilla' }" @click="tab = 'plantilla'">Plantilla</a>
      </div>

      <!-- ══ CALENDARIO ══ -->
      <div v-if="tab === 'resumen'" class="space-y-8">
        <section>
          <h2 class="text-lg font-black mb-3">Partidos por disputar</h2>
          <div v-if="!pendingSeries.length" class="text-sm opacity-40 py-6 text-center border border-dashed border-base-300 rounded-xl">
            No hay partidos pendientes.
          </div>
          <div v-else class="space-y-2">
            <a
              v-for="s in pendingSeries" :key="s.id"
              :href="`/series?id=${s.id}`"
              class="flex items-center gap-3 bg-base-100 hover:bg-base-200 transition-colors border border-base-300 rounded-xl px-4 py-3"
            >
              <TeamLogo size="md" :url="rivalBadge(s)" />
              <div class="flex-1 min-w-0">
                <div class="font-semibold truncate">vs {{ rivalName(s) }}</div>
                <div class="text-xs opacity-40">{{ s.round }} · {{ s.stageType === 'groups' ? `Grupo ${s.group}` : 'Eliminatoria' }}</div>
              </div>
              <span class="badge badge-sm" :class="s.status === 'in_progress' ? 'badge-warning' : 'badge-ghost'">
                {{ s.status === 'in_progress' ? 'En curso' : 'Sin jugar' }}
              </span>
            </a>
          </div>
        </section>

        <section v-if="playedSeries.length">
          <h2 class="text-lg font-black mb-3">Historial</h2>
          <div class="space-y-2">
            <a
              v-for="s in playedSeries" :key="s.id"
              :href="`/series?id=${s.id}`"
              class="flex items-center gap-3 bg-base-100 hover:bg-base-200 transition-colors border border-base-300 border-l-4 rounded-xl px-4 py-3"
              :class="{
                'border-l-success': mySeriesResult(s) === 'win',
                'border-l-error': mySeriesResult(s) === 'loss',
                'border-l-base-300': mySeriesResult(s) === 'draw',
              }"
            >
              <TeamLogo size="md" :url="rivalBadge(s)" />
              <div class="flex-1 min-w-0">
                <div class="font-semibold truncate">vs {{ rivalName(s) }}</div>
                <div class="text-xs opacity-40 flex items-center gap-1.5">
                  <span>{{ s.round }}</span>
                  <span class="badge badge-ghost badge-xs font-bold">{{ s.bestOf === 1 ? 'MD1' : 'MD3' }}</span>
                </div>
              </div>
              <span
                class="font-black tabular-nums text-lg"
                :class="{
                  'text-success': mySeriesResult(s) === 'win',
                  'text-error': mySeriesResult(s) === 'loss',
                }"
              >{{ myScore(s) }}</span>
            </a>
          </div>
        </section>
      </div>

      <!-- ══ PLANTILLA ══ -->
      <div v-else-if="tab === 'plantilla'">
        <div v-if="!squad.length" class="text-sm opacity-40 py-10 text-center border border-dashed border-base-300 rounded-xl">
          Todavía no hay partidos confirmados con estadísticas de jugadores.
        </div>
        <div v-else class="space-y-6">
          <section v-for="group in positionGroups" :key="group.key">
            <h3 class="text-xs font-black uppercase tracking-wide opacity-40 mb-2.5">
              {{ group.label }} <span class="opacity-60">· {{ group.players.length }}</span>
            </h3>
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <PlayerCard
                v-for="p in group.players" :key="p.eaPlayerId"
                :name="p.playerName"
                :position="mainPosition(p)"
                :rating="p.avgRating"
                :mvp="p.manOfTheMatch"
                :red-cards="p.redCards"
                :stats="squadCardStats(p)"
                :href="`/jugador?id=${p.eaPlayerId}`"
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>
