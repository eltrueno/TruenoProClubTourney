<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type {IGroupStanding, ISeries, ITeam } from '@trueno-proclub-tourney/shared';
import { api, teamBadge } from '@/lib/api';
import Loader from '@/components/layout/Loader.vue';
import AppError from '@/components/ui/Error.vue';
import TeamLogo from '@/components/ui/TeamLogo.vue';

const props = defineProps<{
  stageId: string;
  stageName: string;
  series: ISeries[];
  teams: Record<string, ITeam>;
  qualifyCount: number;
  bestOthers?: number;
}>();

const standings = ref<Record<string, IGroupStanding[]>>({});
const loading = ref(true);
const error = ref<string | null>(null);

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

const qualifyCount = props.qualifyCount || 2;
const bestOthers = props.bestOthers || 0;

const dynamicBestOthers = computed(() => {
  if (!bestOthers || bestOthers <= 0) return new Set<string>();

  const candidates: IGroupStanding[] = [];
  for (const group of groupNames.value) {
    const st = standings.value[group];
    if (st && st.length > qualifyCount) {
      candidates.push(st[qualifyCount]);
    }
  }

  candidates.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
    return b.goalsFor - a.goalsFor;
  });

  return new Set(candidates.slice(0, bestOthers).map(c => c.teamId));
});

function team(id: string | null): ITeam | undefined {
  return id ? props.teams[id] : undefined;
}
function teamName(id: string | null) {
  return id ? (team(id)?.name ?? '...') : 'Por determinar';
}

function goToTeam(teamId: string) {
  window.location.href = `/equipo?id=${teamId}`;
}

</script>

<template>
  <div v-if="loading" class="flex justify-center py-16">
    <Loader />
  </div>
  <AppError v-else-if="error" :error="error" />

  <div v-else>
    <!-- Grid responsivo: 1 col en mobile, 2 en md, 3 en lg -->
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      <div v-for="g in groupNames" :key="g" class="card bg-base-100 shadow-sm">
        <div class="card-body p-0">
          <h3 class="text-sm font-black uppercase tracking-wider px-4 pt-4 pb-2">Grupo {{ g }}</h3>
          <table class="table table-sm">
            <thead>
              <tr class="text-xs uppercase opacity-60">
                <th class="w-6">#</th>
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
                :class="{
                  'bg-success/10': idx < qualifyCount,
                  'bg-info/10': idx === qualifyCount && dynamicBestOthers.has(row.teamId)
                }"
                @click="goToTeam(row.teamId)"
              >
                <td class="font-bold tabular-nums relative">
                  <span
                    class="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                    :class="{
                      'bg-success': idx < qualifyCount,
                      'bg-info': idx === qualifyCount && dynamicBestOthers.has(row.teamId),
                      'bg-transparent': idx > qualifyCount || (idx === qualifyCount && !dynamicBestOthers.has(row.teamId))
                    }"
                  ></span>
                  {{ idx + 1 }}
                </td>
                <td>
                  <div class="flex items-center gap-2 min-w-0">
                    <TeamLogo size="sm" :url="teamBadge(team(row.teamId))" />
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
        <div class="px-4 pb-3 flex flex-wrap gap-3 text-xs opacity-60">
          <span>
            <span class="inline-block w-2 h-2 rounded-full bg-success mr-1"></span>
            Clasifica ({{ qualifyCount }}º primeros)
          </span>
          <span v-if="bestOthers > 0">
            <span class="inline-block w-2 h-2 rounded-full bg-info mr-1"></span>
            Mejor 3º ({{ bestOthers }} plazas)
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
