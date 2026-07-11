<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import type { ISeries, ITeam } from '@trueno-pro-club-tourney/shared';
import { api, teamBadge } from '../lib/api';

const series = ref<ISeries[]>([]);
const teams = ref<Record<string, ITeam>>({});
const loading = ref(true);
const error = ref<string | null>(null);

onMounted(async () => {
  try {
    const [seriesData, teamsData] = await Promise.all([api.getSeries(), api.getTeams()]);
    series.value = seriesData;
    teams.value = Object.fromEntries(teamsData.map((t) => [t.id, t]));
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error cargando el bracket';
  } finally {
    loading.value = false;
  }
});

const rounds = computed(() => {
  const byRound = new Map<string, ISeries[]>();
  for (const s of series.value) {
    if (!byRound.has(s.round)) byRound.set(s.round, []);
    byRound.get(s.round)!.push(s);
  }
  return Array.from(byRound.entries());
});

function teamLabel(teamId: string | null): string {
  if (!teamId) return 'Por determinar';
  return teams.value[teamId]?.name ?? '...';
}

function teamBadgeUrl(teamId: string | null): string | null {
  if (!teamId) return null;
  return teamBadge(teams.value[teamId]);
}
</script>

<template>
  <div>
    <div v-if="loading" class="flex justify-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <div v-else-if="error" class="alert alert-error">{{ error }}</div>

    <div v-else class="space-y-8">
      <section v-for="[round, items] in rounds" :key="round">
        <h2 class="text-lg font-bold mb-3">{{ round }}</h2>
        <div class="grid gap-3 sm:grid-cols-2">
          <div v-for="s in items" :key="s.id" class="card bg-base-100 shadow-sm">
            <div class="card-body py-3 px-4">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <img v-if="teamBadgeUrl(s.teamA)" :src="teamBadgeUrl(s.teamA)!" class="w-6 h-6 object-contain" />
                  <span>{{ teamLabel(s.teamA) }}</span>
                </div>
                <span class="badge" :class="s.status === 'completed' ? 'badge-success' : 'badge-ghost'">
                  {{ s.status }}
                </span>
              </div>
              <div class="flex items-center gap-2 mt-1">
                <img v-if="teamBadgeUrl(s.teamB)" :src="teamBadgeUrl(s.teamB)!" class="w-6 h-6 object-contain" />
                <span>{{ teamLabel(s.teamB) }}</span>
              </div>
              <a :href="`/series?id=${s.id}`" class="link link-primary text-sm mt-2">Ver detalle</a>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
