<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import type { ISeries, ITeam, IMatchPlayer } from '@trueno-proclub-tourney/shared';
import { api, teamBadge } from '../lib/api';

const series = ref<ISeries | null>(null);
const teams = ref<Record<string, ITeam>>({});
const loading = ref(true);
const error = ref<string | null>(null);

onMounted(async () => {
  const id = new URLSearchParams(window.location.search).get('id');
  if (!id) { error.value = 'Falta ?id= en la URL'; loading.value = false; return; }
  try {
    const [s, t] = await Promise.all([api.getSeriesById(id), api.getTeams()]);
    series.value = s;
    teams.value = Object.fromEntries(t.map((t) => [t.id, t]));
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error cargando la serie';
  } finally {
    loading.value = false;
  }
});

function teamName(id: string | null) {
  if (!id) return 'Por determinar';
  return teams.value[id]?.name ?? '...';
}
function badge(id: string | null) {
  if (!id) return null;
  return teamBadge(teams.value[id]);
}
function captainOf(id: string | null) {
  if (!id) return null;
  return teams.value[id]?.captainName ?? null;
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

const posOrder: Record<string, number> = { goalkeeper: 0, defender: 1, midfielder: 2, forward: 3 };
const posLabel: Record<string, string> = { goalkeeper: 'PO', defender: 'DEF', midfielder: 'MED', forward: 'DEL' };

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
</script>

<template>
  <div v-if="loading" class="flex justify-center py-16">
    <span class="loading loading-spinner loading-lg text-primary"></span>
  </div>
  <div v-else-if="error" class="alert alert-error">{{ error }}</div>
  <div v-else-if="series" class="space-y-8">

    <!-- Cabecera: equipos + marcador total -->
    <div class="card bg-base-100 shadow">
      <div class="card-body">
        <p class="text-xs font-semibold uppercase tracking-wider opacity-40 mb-3">{{ series.round }}</p>
        <div class="flex items-center justify-between gap-4">
          <div class="flex flex-col items-center gap-2 flex-1 text-center">
            <img v-if="badge(series.teamA)" :src="badge(series.teamA)!" class="w-14 h-14 object-contain" />
            <span class="font-bold leading-tight">
              <a v-if="series.teamA" :href="`/equipo/${series.teamA}`" class="hover:underline">{{ teamName(series.teamA) }}</a>
              <template v-else>{{ teamName(series.teamA) }}</template>
            </span>
            <span v-if="captainOf(series.teamA)" class="text-xs opacity-50">Capitán: {{ captainOf(series.teamA) }}</span>
            <span v-if="totalScore" class="text-4xl font-black tabular-nums">{{ totalScore.A }}</span>
          </div>
          <div class="text-center shrink-0">
            <span class="text-xl opacity-30 font-bold">vs</span>
            <div class="mt-2">
              <span v-if="series.status === 'completed'" class="badge badge-success">Finalizado</span>
              <span v-else-if="series.status === 'in_progress'" class="badge badge-warning">En curso</span>
              <span v-else class="badge badge-ghost">Pendiente</span>
            </div>
          </div>
          <div class="flex flex-col items-center gap-2 flex-1 text-center">
            <img v-if="badge(series.teamB)" :src="badge(series.teamB)!" class="w-14 h-14 object-contain" />
            <span class="font-bold leading-tight">
              <a v-if="series.teamB" :href="`/equipo/${series.teamB}`" class="hover:underline">{{ teamName(series.teamB) }}</a>
              <template v-else>{{ teamName(series.teamB) }}</template>
            </span>
            <span v-if="captainOf(series.teamB)" class="text-xs opacity-50">Capitán: {{ captainOf(series.teamB) }}</span>
            <span v-if="totalScore" class="text-4xl font-black tabular-nums">{{ totalScore.B }}</span>
          </div>
        </div>
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

      <!-- Stats de jugadores (solo si hay) -->
      <div v-if="match.effective.teamA?.players?.length || match.effective.teamB?.players?.length" class="grid md:grid-cols-2 gap-4">
        <!-- Equipo A -->
        <div class="card bg-base-100 shadow-sm">
          <div class="card-body p-3">
            <p class="text-xs font-semibold uppercase opacity-40 mb-2">{{ teamName(series.teamA) }}</p>
            <div class="overflow-x-auto">
              <table class="table table-xs w-full">
                <thead>
                  <tr class="opacity-40 text-xs">
                    <th>Jugador</th>
                    <th class="text-center">G</th>
                    <th class="text-center">A</th>
                    <th class="text-center">Pases</th>
                    <th class="text-center">Tiros</th>
                    <th class="text-center">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="p in sortedPlayers(match.effective.teamA?.players)" :key="p.eaId"
                    :class="{ 'font-bold text-warning': p.manOfTheMatch }">
                    <td class="max-w-[120px]">
                      <span class="badge badge-xs badge-ghost mr-1">{{ posLabel[p.position] ?? p.position }}</span>
                      <span class="truncate">{{ p.name }}</span>
                      <span v-if="p.manOfTheMatch" class="ml-1 text-warning text-xs">★</span>
                    </td>
                    <td class="text-center font-bold">{{ p.goals || '—' }}</td>
                    <td class="text-center">{{ p.assists || '—' }}</td>
                    <td class="text-center text-xs">{{ p.passesMade }} ({{ p.passesSuccess }}%)</td>
                    <td class="text-center">{{ p.shots || '—' }}</td>
                    <td class="text-center">
                      <span class="badge badge-xs"
                        :class="p.rating >= 8 ? 'badge-success' : p.rating >= 6.5 ? 'badge-warning' : 'badge-error'">
                        {{ p.rating.toFixed(1) }}
                      </span>
                    </td>
                  </tr>
                  <!-- Portero con stats específicas -->
                  <tr v-for="p in sortedPlayers(match.effective.teamA?.players).filter(p => p.position === 'goalkeeper')"
                    :key="`gk-${p.eaId}`" class="opacity-60 text-xs">
                    <td colspan="6" class="pl-6">
                      Paradas: {{ p.saves }} ({{ p.goodDirectionSaves }} buen ángulo{{ p.crossSaves ? `, ${p.crossSaves} centro` : '' }})
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Equipo B -->
        <div class="card bg-base-100 shadow-sm">
          <div class="card-body p-3">
            <p class="text-xs font-semibold uppercase opacity-40 mb-2">{{ teamName(series.teamB) }}</p>
            <div class="overflow-x-auto">
              <table class="table table-xs w-full">
                <thead>
                  <tr class="opacity-40 text-xs">
                    <th>Jugador</th>
                    <th class="text-center">G</th>
                    <th class="text-center">A</th>
                    <th class="text-center">Pases</th>
                    <th class="text-center">Tiros</th>
                    <th class="text-center">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="p in sortedPlayers(match.effective.teamB?.players)" :key="p.eaId"
                    :class="{ 'font-bold text-warning': p.manOfTheMatch }">
                    <td class="max-w-[120px]">
                      <span class="badge badge-xs badge-ghost mr-1">{{ posLabel[p.position] ?? p.position }}</span>
                      <span class="truncate">{{ p.name }}</span>
                      <span v-if="p.manOfTheMatch" class="ml-1 text-warning text-xs">★</span>
                    </td>
                    <td class="text-center font-bold">{{ p.goals || '—' }}</td>
                    <td class="text-center">{{ p.assists || '—' }}</td>
                    <td class="text-center text-xs">{{ p.passesMade }} ({{ p.passesSuccess }}%)</td>
                    <td class="text-center">{{ p.shots || '—' }}</td>
                    <td class="text-center">
                      <span class="badge badge-xs"
                        :class="p.rating >= 8 ? 'badge-success' : p.rating >= 6.5 ? 'badge-warning' : 'badge-error'">
                        {{ p.rating.toFixed(1) }}
                      </span>
                    </td>
                  </tr>
                  <tr v-for="p in sortedPlayers(match.effective.teamB?.players).filter(p => p.position === 'goalkeeper')"
                    :key="`gk-${p.eaId}`" class="opacity-60 text-xs">
                    <td colspan="6" class="pl-6">
                      Paradas: {{ p.saves }} ({{ p.goodDirectionSaves }} buen ángulo{{ p.crossSaves ? `, ${p.crossSaves} centro` : '' }})
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Historial de ediciones -->
      <details v-if="match.edits?.length" class="collapse collapse-arrow bg-base-100">
        <summary class="collapse-title text-xs opacity-40 min-h-0 py-2">
          {{ match.edits.length }} edición(es) manuales
        </summary>
        <div class="collapse-content">
          <div v-for="edit in match.edits" :key="edit.at" class="text-xs opacity-50 py-1 border-t border-base-200">
            <span class="font-mono">{{ new Date(edit.at).toLocaleString('es') }}</span> — {{ edit.change }}
          </div>
        </div>
      </details>
    </div>

  </div>
</template>
