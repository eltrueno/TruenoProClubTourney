<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type {IGroupStanding, ISeries, ITeam } from '@trueno-proclub-tourney/shared';
import { api, teamBadge } from '@/lib/api';

const props = defineProps<{
  stageId: string;
  stageName: string;
  series: ISeries[];
  teams: Record<string, ITeam>;
  qualifyCount: number
}>();

const standings = ref<Record<string, IGroupStanding[]>>({});
const loading = ref(true);
const error = ref<string | null>(null);
const activeGroup = ref<string | null>(null);

watch(
  () => props.stageId,
  () => {
    load();
  },
  { immediate: true }
);

async function load() {
  loading.value = true;
  error.value = null;
  try {
  standings.value = await api.series.getStandings(props.stageId);
  activeGroup.value = groupNames.value[0] ?? null;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error cargando la clasificación';
  } finally {
    loading.value = false;
  }
}

const groupNames = computed(() =>
  [...new Set(
    props.series
      .filter(s => s.stageId === props.stageId && s.group)
      .map(s => s.group!)
  )].sort()
);

const seriesByGroup = computed(() => {
  const map = new Map<string, ISeries[]>();
  for (const s of props.series) {
    if (s.stageId !== props.stageId || !s.group) continue;
    if (!map.has(s.group)) map.set(s.group, []);
    map.get(s.group)!.push(s);
  }
  return map;
});

function team(id: string | null): ITeam | undefined {
  return id ? props.teams[id] : undefined;
}
function teamName(id: string | null) {
  return id ? (team(id)?.name ?? '...') : 'Por determinar';
}

function teamId(team: string | ITeam | null): string | null {
  if (!team) return null;
  return typeof team === 'string' ? team : team.id;
}

function seriesScore(series: ISeries) {
  const confirmed = series.matches.filter((m) => m.status === 'confirmed');

  if (!confirmed.length) return null;

  return confirmed.reduce(
    (acc, match) => ({
      a: acc.a + (match.effective.teamA.score ?? 0),
      b: acc.b + (match.effective.teamB.score ?? 0),
    }),
    { a: 0, b: 0 }
  );
}

const seriesStatusLabel: Record<ISeries['status'], string> = {
  pending: 'Pendiente',
  in_progress: 'En juego',
  completed: 'Finalizada',
};

const seriesStatusBadgeClass: Record<ISeries['status'], string> = {
  pending: 'badge-ghost',
  in_progress: 'badge-warning',
  completed: 'badge-success',
};

const qualifyCount = props.qualifyCount || 2

function goToTeam(teamId: string) {
  window.location.href = `/equipo?id=${teamId}`;
}

</script>

<template>
  <div v-if="loading" class="flex justify-center py-16">
    <span class="loading loading-spinner loading-lg text-primary"></span>
  </div>
  <div v-else-if="error" class="alert alert-error">{{ error }}</div>

  <div v-else class="space-y-6">
    <!-- Selector de grupo -->
    <div class="tabs tabs-boxed bg-base-100 shadow-sm inline-flex flex-wrap w-auto">
      <a
        v-for="g in groupNames"
        :key="g"
        class="tab"
        :class="{ 'tab-active': activeGroup === g }"
        @click="activeGroup = g"
      >
        Grupo {{ g }}
      </a>
    </div>

    <div v-for="g in groupNames" :key="g" v-show="activeGroup === g" class="grid gap-6 lg:grid-cols-5">
      <!-- Tabla de clasificación -->
      <div class="lg:col-span-3 card bg-base-100 shadow-sm">
        <div class="card-body p-0">
          <table class="table">
            <thead>
              <tr class="text-xs uppercase opacity-60">
                <th class="w-8">#</th>
                <th>Equipo</th>
                <th class="text-center" title="Partidos jugados">PJ</th>
                <th class="text-center" title="Diferencia de goles">DG</th>
                <th class="text-center" title="Goles a favor">GF</th>
                <th class="text-center font-bold" title="Puntos">Pts</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, idx) in standings[g] ?? []"
                :key="row.teamId"
                class="hover:bg-base-200 cursor-pointer transition-colors"
                :class="{ 'bg-success/10': idx < qualifyCount }"
                @click="goToTeam(row.teamId)"
              >
                <td class="font-bold tabular-nums relative">
                  <span
                    class="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                    :class="idx < qualifyCount ? 'bg-success' : 'bg-transparent'"
                  ></span>
                  {{ idx + 1 }}
                </td>
                <td>
                  <div class="flex items-center gap-2 min-w-0">
                    <img v-if="teamBadge(team(row.teamId))" :src="teamBadge(team(row.teamId))!" class="w-5 h-5 object-contain shrink-0" />
                    <span class="truncate font-medium">{{ teamName(row.teamId) }}</span>
                  </div>
                </td>
                <td class="text-center tabular-nums">{{ row.played }}</td>
                <td class="text-center tabular-nums">{{ row.goalDiff > 0 ? '+' : '' }}{{ row.goalDiff }}</td>
                <td class="text-center tabular-nums">{{ row.goalsFor }}</td>
                <td class="text-center tabular-nums font-black">{{ row.points }}</td>
              </tr>
              <tr v-if="!(standings[g] ?? []).length">
                <td colspan="6" class="text-center opacity-50 py-6">Sin datos todavía</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="text-xs opacity-50 px-4 pb-3 -mt-1">
          <span class="inline-block w-2 h-2 rounded-full bg-success mr-1"></span>
          Zona de clasificación ({{ qualifyCount }} primeros)
        </p>
      </div>

      <!-- Partidos del grupo -->
      <div class="lg:col-span-2 space-y-2">
        <h3 class="text-sm font-semibold uppercase tracking-wider opacity-50">Partidos</h3>
        <a
          v-for="s in seriesByGroup.get(g) ?? []"
          :key="s.id"
          :href="`/series?id=${s.id}`"
          class="card bg-base-100 shadow-sm hover:shadow-md transition-shadow block"
        >
          <div class="card-body py-3 px-4 gap-1">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 min-w-0">
                <img v-if="teamBadge(team(teamId(s.teamA)))" :src="teamBadge(team(teamId(s.teamA)))!" class="w-4 h-4 object-contain shrink-0" />
                <span class="truncate text-sm">{{ teamName(teamId(s.teamA)) }}</span>
              </div>
              <span class="font-bold tabular-nums ml-2 shrink-0">{{ seriesScore(s)?.a ?? '-' }}</span>
            </div>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 min-w-0">
                <img v-if="teamBadge(team(teamId(s.teamB)))" :src="teamBadge(team(teamId(s.teamB)))!" class="w-4 h-4 object-contain shrink-0" />
                <span class="truncate text-sm">{{ teamName(teamId(s.teamB)) }}</span>
              </div>
              <span class="font-bold tabular-nums ml-2 shrink-0">{{ seriesScore(s)?.b ?? '-' }}</span>
            </div>
            <span class="badge badge-xs mt-1" :class="seriesStatusBadgeClass[s.status]">{{ seriesStatusLabel[s.status] }}</span>
          </div>
        </a>
        <p v-if="!(seriesByGroup.get(g) ?? []).length" class="text-sm opacity-50 py-4 text-center">
          Todavía no hay partidos generados para este grupo
        </p>
      </div>
    </div>
  </div>
</template>
