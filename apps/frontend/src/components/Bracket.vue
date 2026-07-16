<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import type { ISeries, ITeam } from '@trueno-proclub-tourney/shared';
import { api, teamBadge } from '../lib/api';

const series = ref<ISeries[]>([]);
const teams = ref<Record<string, ITeam>>({});
const loading = ref(true);
const error = ref<string | null>(null);

onMounted(async () => {
  try {
    const [s, t] = await Promise.all([api.getSeries(), api.getTeams()]);
    series.value = s;
    teams.value = Object.fromEntries(t.map((t) => [t.id, t]));
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error cargando el bracket';
  } finally {
    loading.value = false;
  }
});

// Agrupa por stageType → round → series
const stages = computed(() => {
  const map = new Map<string, { stageType: string; rounds: Map<string, ISeries[]> }>();
  for (const s of series.value) {
    if (!map.has(s.stageId)) {
      map.set(s.stageId, { stageType: s.stageType, rounds: new Map() });
    }
    const stage = map.get(s.stageId)!;
    if (!stage.rounds.has(s.round)) stage.rounds.set(s.round, []);
    stage.rounds.get(s.round)!.push(s);
  }
  return Array.from(map.entries());
});

function teamName(id: string | null) {
  if (!id) return 'Por determinar';
  return teams.value[id]?.name ?? '...';
}
function badge(id: string | null) {
  if (!id) return null;
  return teamBadge(teams.value[id]);
}
function score(s: ISeries) {
  const confirmed = s.matches.filter((m) => m.status === 'confirmado');
  if (!confirmed.length) return null;
  const gA = confirmed.reduce((acc, m) => acc + (m.effective.scoreA ?? 0), 0);
  const gB = confirmed.reduce((acc, m) => acc + (m.effective.scoreB ?? 0), 0);
  return `${gA} - ${gB}`;
}
const statusClass: Record<string, string> = {
  pending: 'badge-ghost',
  in_progress: 'badge-warning',
  completed: 'badge-success',
};
</script>

<template>
  <div>
    <div v-if="loading" class="flex justify-center py-16">
      <span class="loading loading-spinner loading-lg text-primary"></span>
    </div>
    <div v-else-if="error" class="alert alert-error">{{ error }}</div>

    <div v-else class="space-y-10">
      <section v-for="[stageId, stageData] in stages" :key="stageId">

        <!-- Fase de grupos: tabla por grupo -->
        <div v-if="stageData.stageType === 'groups'" class="space-y-6">
          <div v-for="[round, items] in stageData.rounds" :key="round">
            <h3 class="text-sm font-semibold uppercase tracking-wider opacity-50 mb-2">{{ round }}</h3>
            <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <div v-for="s in items" :key="s.id" class="card bg-base-100 shadow-sm hover:shadow transition-shadow">
                <div class="card-body py-3 px-4 gap-1">
                  <!-- Equipo A -->
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2 min-w-0">
                      <img v-if="badge(s.teamA)" :src="badge(s.teamA)!" class="w-5 h-5 object-contain shrink-0" />
                      <span class="truncate text-sm font-medium">{{ teamName(s.teamA) }}</span>
                    </div>
                    <span v-if="score(s)" class="font-bold tabular-nums ml-2 shrink-0">{{ score(s)?.split(' - ')[0] }}</span>
                  </div>
                  <!-- Equipo B -->
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2 min-w-0">
                      <img v-if="badge(s.teamB)" :src="badge(s.teamB)!" class="w-5 h-5 object-contain shrink-0" />
                      <span class="truncate text-sm font-medium">{{ teamName(s.teamB) }}</span>
                    </div>
                    <span v-if="score(s)" class="font-bold tabular-nums ml-2 shrink-0">{{ score(s)?.split(' - ')[1] }}</span>
                  </div>
                  <div class="flex items-center justify-between mt-1">
                    <span class="badge badge-xs" :class="statusClass[s.status]">{{ s.status }}</span>
                    <a :href="`/series?id=${s.id}`" class="link link-primary text-xs">Ver detalle →</a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Eliminatorias: columnas de rondas -->
        <div v-else-if="stageData.stageType === 'knockout'">
          <div class="flex gap-4 overflow-x-auto pb-2">
            <div v-for="[round, items] in stageData.rounds" :key="round" class="flex flex-col gap-3 min-w-52">
              <h3 class="text-sm font-semibold uppercase tracking-wider opacity-50 text-center">{{ round }}</h3>
              <div v-for="s in items" :key="s.id"
                class="card bg-base-100 shadow-sm border-l-2"
                :class="s.status === 'completed' ? 'border-success' : s.status === 'in_progress' ? 'border-warning' : 'border-base-300'">
                <div class="card-body py-3 px-4 gap-1">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2 min-w-0">
                      <img v-if="badge(s.teamA)" :src="badge(s.teamA)!" class="w-5 h-5 object-contain shrink-0" />
                      <span class="truncate text-sm" :class="{ 'font-bold': score(s) && Number(score(s)?.split(' - ')[0]) > Number(score(s)?.split(' - ')[1]) }">
                        {{ teamName(s.teamA) }}
                      </span>
                    </div>
                    <span class="font-bold tabular-nums ml-2 shrink-0">{{ score(s)?.split(' - ')[0] ?? '-' }}</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2 min-w-0">
                      <img v-if="badge(s.teamB)" :src="badge(s.teamB)!" class="w-5 h-5 object-contain shrink-0" />
                      <span class="truncate text-sm" :class="{ 'font-bold': score(s) && Number(score(s)?.split(' - ')[1]) > Number(score(s)?.split(' - ')[0]) }">
                        {{ teamName(s.teamB) }}
                      </span>
                    </div>
                    <span class="font-bold tabular-nums ml-2 shrink-0">{{ score(s)?.split(' - ')[1] ?? '-' }}</span>
                  </div>
                  <a :href="`/series?id=${s.id}`" class="link link-primary text-xs mt-1">Ver →</a>
                </div>
              </div>
            </div>
          </div>
        </div>

      </section>
    </div>
  </div>
</template>
