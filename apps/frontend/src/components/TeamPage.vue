<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import type { ISeries, ITeam } from '@trueno-proclub-tourney/shared';
import { api, teamBadge } from '../lib/api';

const teamId = ref<string | null>(null);
const team = ref<ITeam | null>(null);
const allSeries = ref<ISeries[]>([]);
const teams = ref<Record<string, ITeam>>({});
const loading = ref(true);
const error = ref<string | null>(null);

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
    const [t, s, allTeams] = await Promise.all([
      api.teams.getById(id),
      api.series.getAll(id),
      api.teams.getAll(),
    ]);
    team.value = t;
    allSeries.value = s;
    teams.value = Object.fromEntries(allTeams.map((x) => [x.id, x]));
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudo cargar el equipo';
  } finally {
    loading.value = false;
  }
});

const mySeries = computed(() => allSeries.value);
const pendingSeries = computed(() => mySeries.value.filter((s) => s.status !== 'completed'));
const playedSeries = computed(() => mySeries.value.filter((s) => s.status === 'completed'));

function resolveTeam(team: TeamRef): ITeam | undefined {
  if (!team) return undefined;

  return typeof team === 'string'
    ? teams.value[team]
    : team;
}

function getTeamId(team: TeamRef): string | null {
  if (!team) return null;
  return typeof team === 'string'
    ? team
    : team.id;
}

function rival(s: ISeries): TeamRef {
  return getTeamId(s.teamA) === teamId.value
    ? s.teamB
    : s.teamA;
}

function rivalName(s: ISeries) {
  const team = resolveTeam(rival(s));
  return team?.name ?? 'Por determinar';
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
function myScore(s: ISeries) {
  const [wA, wB] = seriesWins(s);

  return getTeamId(s.teamA) === teamId.value
    ? `${wA} – ${wB}`
    : `${wB} – ${wA}`;
}
</script>

<template>
  <div v-if="loading" class="flex justify-center py-20">
    <span class="loading loading-spinner loading-lg text-primary"></span>
  </div>
  <div v-else-if="error || !team" class="alert alert-error">{{ error ?? 'Equipo no encontrado' }}</div>

  <div v-else class="space-y-8">
    <!-- Cabecera del equipo -->
    <div class="flex items-center gap-5 bg-base-100 rounded-2xl p-6 shadow-sm border border-base-300">
      <img v-if="teamBadge(team)" :src="teamBadge(team)!" class="w-16 h-16 object-contain shrink-0" />
      <div v-else class="w-16 h-16 rounded bg-base-300 shrink-0"></div>
      <div class="min-w-0">
        <h1 class="text-2xl font-black truncate">{{ team.name }}</h1>
        <p v-if="team.captainName" class="text-sm opacity-60">Capitán: {{ team.captainName }}</p>
        <p v-if="team.group" class="text-xs opacity-40 mt-1">Grupo {{ team.group }}</p>
      </div>
    </div>

    <!-- Partidos por disputar -->
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
          <img v-if="rivalBadge(s)" :src="rivalBadge(s)!" class="w-8 h-8 object-contain shrink-0" />
          <div v-else class="w-8 h-8 rounded bg-base-300 shrink-0"></div>
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

    <!-- Partidos jugados -->
    <section v-if="playedSeries.length">
      <h2 class="text-lg font-black mb-3">Historial</h2>
      <div class="space-y-2">
        <a
          v-for="s in playedSeries" :key="s.id"
          :href="`/series?id=${s.id}`"
          class="flex items-center gap-3 bg-base-100 hover:bg-base-200 transition-colors border border-base-300 rounded-xl px-4 py-3"
        >
          <img v-if="rivalBadge(s)" :src="rivalBadge(s)!" class="w-8 h-8 object-contain shrink-0" />
          <div v-else class="w-8 h-8 rounded bg-base-300 shrink-0"></div>
          <div class="flex-1 min-w-0">
            <div class="font-semibold truncate">vs {{ rivalName(s) }}</div>
            <div class="text-xs opacity-40">{{ s.round }}</div>
          </div>
          <span class="font-black tabular-nums">{{ myScore(s) }}</span>
        </a>
      </div>
    </section>
  </div>
</template>
