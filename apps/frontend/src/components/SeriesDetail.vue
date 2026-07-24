<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import type { ISeries, ITeam, IMatchPlayer, IMatch } from '@trueno-proclub-tourney/shared';
import { api, teamBadge } from '../lib/api';
import { translateApiError } from '../i18n/translations';
import AppError from '@/components/ui/Error.vue';
import Loader from '@/components/layout/Loader.vue';
import TeamLogo from '@/components/ui/TeamLogo.vue';
import PlayerCard from '@/components/ui/PlayerCard.vue';
import type { PlayerCardStat } from '@/components/ui/PlayerCard.vue';
import StatCompareBar from '@/components/ui/StatCompareBar.vue';

const series = ref<ISeries | null>(null);
const teams = ref<Record<string, ITeam>>({});
const loading = ref(true);
const error = ref<string | null>(null);

type TeamRef = string | ITeam | null;

onMounted(async () => {
  const id = new URLSearchParams(window.location.search).get('id');
  if (!id) { error.value = 'Falta ?id= en la URL'; loading.value = false; return; }
  try {
    const [s, t] = await Promise.all([api.series.getById(id), api.teams.getAll()]);
    series.value = s;
    teams.value = Object.fromEntries(t.map((t) => [t.id, t]));
  } catch (e) {
    error.value = translateApiError(e);
  } finally {
    loading.value = false;
  }
});

function resolveTeam(team: TeamRef): ITeam | undefined {
  if (!team) return undefined;

  return typeof team === 'string'
    ? teams.value[team]
    : team;
}

function teamId(team: TeamRef): string | null {
  if (!team) return null;
  return typeof team === 'string'
    ? team
    : team.id;
}

function teamName(team: TeamRef) {
  if (!team) return 'Por determinar';
  return resolveTeam(team)?.name ?? '...';
}

function badge(team: TeamRef) {
  return teamBadge(resolveTeam(team));
}

function captainOf(team: TeamRef) {
  return resolveTeam(team)?.captainName ?? null;
}


const totalScore = computed(() => {
  if (!series.value) return null;
  const confirmed = series.value.matches.filter((m) => m.status === 'confirmed');
  if (!confirmed.length) return null;
  return {
    A: confirmed.reduce((acc, m) => acc + (m.effective.teamA?.score ?? 0), 0),
    B: confirmed.reduce((acc, m) => acc + (m.effective.teamB?.score ?? 0), 0),
  };
});

const statusBadge: Record<string, string> = {
  unselected: 'badge-ghost',
  pending_confirmation: 'badge-warning',
  confirmed: 'badge-success',
  disputed: 'badge-error',
};

const seriesStatusBadge: Record<string, string> = {
  pending: 'badge-ghost',
  in_progress: 'badge-warning',
  completed: 'badge-success',
};
const seriesStatusLabel: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En curso',
  completed: 'Finalizado',
};

/** Punto de progreso de cada partida de la serie (para el bo3), visto desde el marcador global */
function matchDotClass(m: IMatch): string {
  if (m.status !== 'confirmed') return 'bg-base-300';
  const sA = m.effective.teamA?.score ?? 0, sB = m.effective.teamB?.score ?? 0;
  const pA = m.effective.teamA?.penaltiesScore ?? 0, pB = m.effective.teamB?.penaltiesScore ?? 0;
  return sA === sB && pA === pB ? 'bg-base-content/40' : 'bg-primary';
}

const posOrder: Record<string, number> = { goalkeeper: 0, defender: 1, midfielder: 2, forward: 3 };

function sortedPlayers(stats: IMatchPlayer[] | undefined) {
  if (!stats) return [];
  return [...stats].sort(
    (a, b) => (posOrder[a.position] ?? 9) - (posOrder[b.position] ?? 9)
  );
}

function formatScore(teamData: any) {
  if (!teamData || teamData.score == null) return '';
  let res = teamData.score.toString();
  if (teamData.penaltiesScore != null) {
    res += ` (${teamData.penaltiesScore})`;
  }
  return res;
}

/** Stats de la tarjeta de un jugador, distintas si es portero o jugador de campo */
function playerCardStats(p: IMatchPlayer): PlayerCardStat[] {
  if (p.position === 'goalkeeper') {
    return [
      { label: 'Paradas', value: p.saves, emphasis: true },
      { label: 'Recibidos', value: p.goalsConceded },
      { label: 'Pases', value: `${p.passesMade} (${p.passesSuccess}%)` },
    ];
  }
  return [
    { label: 'Goles', value: p.goals, emphasis: true },
    { label: 'Asist.', value: p.assists },
    { label: 'Tiros', value: p.shots },
    { label: 'Pases', value: `${p.passesMade} (${p.passesSuccess}%)` },
  ];
}

function pct(success: number, attempts: number) {
  return attempts > 0 ? Math.round((success / attempts) * 100) : 0;
}

/** Comparativa de stats de equipo para una partida concreta */
function matchTeamStats(m: IMatch) {
  const a = m.effective.teamA?.stats;
  const b = m.effective.teamB?.stats;
  if (!a || !b) return [];
  return [
    { label: 'Tiros', valueA: a.shots, valueB: b.shots },
    { label: 'Pases completados', valueA: a.passesSuccess, valueB: b.passesSuccess },
    { label: 'Precisión de pase', valueA: pct(a.passesSuccess, a.passesMade), valueB: pct(b.passesSuccess, b.passesMade), suffix: '%' },
    { label: 'Entradas', valueA: a.tacklesMade, valueB: b.tacklesMade },
    { label: 'Precisión de entrada', valueA: pct(a.tacklesSuccess, a.tacklesMade), valueB: pct(b.tacklesSuccess, b.tacklesMade), suffix: '%' },
    { label: 'Tarjetas rojas', valueA: a.redCards, valueB: b.redCards, higherIsBetter: false },
  ];
}
</script>

<template>
  <div>
    <div v-if="loading" class="flex justify-center py-16">
      <Loader />
    </div>
  <AppError v-else-if="error" :error="error" />
  <div v-else-if="series" class="space-y-8">

    <!-- Cabecera: equipos + marcador total -->
    <div class="card-gold p-5 sm:p-7">
      <div class="flex items-center justify-between gap-3 mb-5">
        <p class="text-xs font-bold uppercase tracking-widest opacity-50">
          {{ series.round }}<span v-if="series.group"> · Grupo {{ series.group }}</span>
          <span class="opacity-60"> · {{ series.bestOf === 1 ? 'Al mejor de 1' : 'Al mejor de 3' }}</span>
        </p>
        <span class="badge" :class="seriesStatusBadge[series.status]">{{ seriesStatusLabel[series.status] }}</span>
      </div>

      <div class="flex items-center gap-3 sm:gap-6">
        <!-- Equipo A -->
        <component
          :is="series.teamA ? 'a' : 'div'"
          :href="series.teamA ? `/equipo?id=${teamId(series.teamA)}` : undefined"
          class="group flex-1 min-w-0 flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left"
        >
          <TeamLogo size="lg" :url="badge(series.teamA)" />
          <div class="min-w-0">
            <div class="font-black text-base sm:text-lg leading-tight truncate group-hover:text-primary transition-colors">
              {{ teamName(series.teamA) }}
            </div>
            <div v-if="captainOf(series.teamA)" class="text-xs opacity-50 truncate">Capitán: {{ captainOf(series.teamA) }}</div>
          </div>
        </component>

        <!-- Marcador -->
        <div class="shrink-0 text-center px-1">
          <div v-if="totalScore" class="flex items-center gap-2.5 sm:gap-4 text-4xl sm:text-5xl font-black tabular-nums gold-text">
            <span>{{ totalScore.A }}</span>
            <span class="opacity-30 text-xl sm:text-2xl">–</span>
            <span>{{ totalScore.B }}</span>
          </div>
          <div v-else class="text-lg sm:text-xl font-black opacity-30">VS</div>

          <div v-if="series.bestOf > 1" class="flex justify-center gap-1.5 mt-2.5">
            <span
              v-for="m in series.matches" :key="m.position"
              class="w-2 h-2 rounded-full"
              :class="matchDotClass(m)"
              :title="`Partida ${m.position}`"
            ></span>
          </div>
        </div>

        <!-- Equipo B -->
        <component
          :is="series.teamB ? 'a' : 'div'"
          :href="series.teamB ? `/equipo?id=${teamId(series.teamB)}` : undefined"
          class="group flex-1 min-w-0 flex flex-col sm:flex-row-reverse items-center gap-3 text-center sm:text-right"
        >
          <TeamLogo size="lg" :url="badge(series.teamB)" />
          <div class="min-w-0">
            <div class="font-black text-base sm:text-lg leading-tight truncate group-hover:text-primary transition-colors">
              {{ teamName(series.teamB) }}
            </div>
            <div v-if="captainOf(series.teamB)" class="text-xs opacity-50 truncate">Capitán: {{ captainOf(series.teamB) }}</div>
          </div>
        </component>
      </div>
    </div>

    <!-- Partidas -->
    <div v-for="match in series.matches" :key="match.position" class="space-y-4">
      <div class="flex items-center gap-3">
        <h2 class="font-bold text-lg">{{ series.bestOf > 1 ? `Partida ${match.position}` : 'Resultado' }}</h2>
        <span class="badge badge-sm" :class="statusBadge[match.status]">{{ match.status.replace(/_/g, ' ') }}</span>
        <span v-if="match.effective?.teamA?.score != null" class="font-black text-xl tabular-nums ml-auto text-right">
          {{ formatScore(match.effective.teamA) }} – {{ formatScore(match.effective.teamB) }}
          <div v-if="match.winnerByDnf" class="text-xs opacity-50 font-normal uppercase">Victoria por DNF</div>
        </span>
      </div>

      <!-- Comparativa de stats de equipo -->
      <div v-if="matchTeamStats(match).length" class="card bg-base-100 shadow-sm">
        <div class="card-body p-4 sm:p-5 gap-3">
          <p class="text-xs font-bold uppercase tracking-wide opacity-40">Comparativa del equipo</p>
          <div class="grid sm:grid-cols-2 gap-x-8 gap-y-3">
            <StatCompareBar
              v-for="s in matchTeamStats(match)" :key="s.label"
              :label="s.label" :value-a="s.valueA" :value-b="s.valueB"
              :suffix="s.suffix" :higher-is-better="s.higherIsBetter ?? true"
            />
          </div>
        </div>
      </div>

      <!-- Plantillas (solo si hay) -->
      <div v-if="match.effective.teamA?.players?.length || match.effective.teamB?.players?.length" class="grid md:grid-cols-2 gap-4">
        <!-- Equipo A -->
        <div class="card bg-base-100 shadow-sm">
          <div class="card-body p-3 sm:p-4 gap-3">
            <div class="flex items-center gap-2">
              <TeamLogo size="sm" :url="badge(series.teamA)" />
              <p class="text-xs font-bold uppercase tracking-wide opacity-50 truncate">{{ teamName(series.teamA) }}</p>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <PlayerCard
                v-for="p in sortedPlayers(match.effective.teamA?.players)" :key="p.eaId"
                :name="p.name" :position="p.position" :rating="p.rating"
                :mvp="p.manOfTheMatch" :red-cards="p.redCards"
                :stats="playerCardStats(p)" :href="`/jugador?id=${p.eaId}`"
              />
            </div>
          </div>
        </div>

        <!-- Equipo B -->
        <div class="card bg-base-100 shadow-sm">
          <div class="card-body p-3 sm:p-4 gap-3">
            <div class="flex items-center gap-2">
              <TeamLogo size="sm" :url="badge(series.teamB)" />
              <p class="text-xs font-bold uppercase tracking-wide opacity-50 truncate">{{ teamName(series.teamB) }}</p>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <PlayerCard
                v-for="p in sortedPlayers(match.effective.teamB?.players)" :key="p.eaId"
                :name="p.name" :position="p.position" :rating="p.rating"
                :mvp="p.manOfTheMatch" :red-cards="p.redCards"
                :stats="playerCardStats(p)" :href="`/jugador?id=${p.eaId}`"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  </div>
</template>
