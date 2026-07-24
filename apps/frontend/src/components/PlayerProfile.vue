<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import type { IPlayerProfile, ITeam } from '@trueno-proclub-tourney/shared';
import TeamLogo from '@/components/ui/TeamLogo.vue';
import { api, teamBadge } from '../lib/api';
import { translateApiError, translatePosition } from '../i18n/translations';
import AppError from './ui/Error.vue';
import Loader from '@/components/layout/Loader.vue';

const profile = ref<IPlayerProfile | null>(null);
const teams = ref<Record<string, ITeam>>({});
const loading = ref(true);
const error = ref<string | null>(null);

onMounted(async () => {
  const id = new URLSearchParams(window.location.search).get('id');
  if (!id) { error.value = 'Falta ?id= en la URL'; loading.value = false; return; }

  try {
    const [p, allTeams] = await Promise.all([api.playerStats.getOne(id), api.teams.getAll()]);
    profile.value = p;
    teams.value = Object.fromEntries(allTeams.map((t) => [t.id, t]));
  } catch (e) {
    error.value = translateApiError(e);
  } finally {
    loading.value = false;
  }
});

const summary = computed(() => profile.value?.summary ?? null);

const mainPosition = computed(() => {
  const positions = summary.value?.positionsPlayed;
  if (!positions) return null;
  const [pos] = Object.entries(positions).sort((a, b) => b[1] - a[1])[0] ?? [];
  return pos ?? null;
});

const isGoalkeeper = computed(() => mainPosition.value === 'goalkeeper');

const resultBadge: Record<'win' | 'loss' | 'draw', string> = {
  win: 'bg-success text-success-content',
  loss: 'bg-error text-error-content',
  draw: 'bg-base-300',
};
const resultLabel: Record<'win' | 'loss' | 'draw', string> = { win: 'V', loss: 'D', draw: 'E' };

function teamName(id: string | null) {
  if (!id) return 'Por determinar';
  return teams.value[id]?.name ?? '...';
}
function teamLogo(id: string | null) {
  return id ? teamBadge(teams.value[id]) : null;
}
</script>

<template>
  <div>
    <div v-if="loading" class="flex justify-center py-20">
      <Loader />
    </div>

    <AppError v-else-if="error || !profile || !summary" :error="error ?? 'Jugador no encontrado'" />

    <div v-else class="space-y-6">
      <!-- Cabecera del jugador -->
      <div class="bg-base-100 rounded-2xl p-6 shadow-sm border border-base-300">
        <div class="flex flex-wrap items-center gap-5">
          <div class="w-16 h-16 rounded-full bg-base-200 flex items-center justify-center text-2xl font-black shrink-0">
            {{ summary.playerName.charAt(0).toUpperCase() }}
          </div>
          <div class="min-w-0 flex-1">
            <h1 class="text-2xl md:text-3xl font-black truncate">{{ summary.playerName }}</h1>
            <div class="flex flex-wrap items-center gap-2 mt-2">
              <span v-if="mainPosition" class="badge badge-outline">{{ translatePosition(mainPosition) }}</span>
              <span v-if="summary.hattricks" class="badge badge-warning">{{ summary.hattricks }} hat-trick{{ summary.hattricks > 1 ? 's' : '' }}</span>
              <span v-if="summary.pokers" class="badge badge-warning">{{ summary.pokers }} poker{{ summary.pokers > 1 ? 's' : '' }}</span>
            </div>
          </div>
          <div class="text-center">
            <div class="text-3xl font-black" :class="summary.avgRating >= 7 ? 'text-success' : summary.avgRating < 6 ? 'text-error' : ''">
              {{ summary.avgRating.toFixed(1) }}
            </div>
            <div class="text-[10px] uppercase font-bold opacity-50">Media</div>
          </div>
        </div>

        <!-- Stats grid -->
        <div class="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 mt-5">
          <div class="text-center px-2 py-3 bg-base-200 rounded-xl">
            <div class="text-xl font-black">{{ summary.matchesPlayed }}</div>
            <div class="text-[10px] uppercase font-bold opacity-60">Partidos</div>
          </div>
          <div class="text-center px-2 py-3 bg-base-200 rounded-xl">
            <div class="text-xl font-black">{{ summary.goals }}</div>
            <div class="text-[10px] uppercase font-bold opacity-60">Goles</div>
          </div>
          <div class="text-center px-2 py-3 bg-base-200 rounded-xl">
            <div class="text-xl font-black">{{ summary.assists }}</div>
            <div class="text-[10px] uppercase font-bold opacity-60">Asistencias</div>
          </div>
          <div class="text-center px-2 py-3 bg-base-200 rounded-xl">
            <div class="text-xl font-black">{{ summary.shotAccuracy }}%</div>
            <div class="text-[10px] uppercase font-bold opacity-60">Precisión tiro</div>
          </div>
          <div class="text-center px-2 py-3 bg-base-200 rounded-xl">
            <div class="text-xl font-black">{{ summary.passAccuracy }}%</div>
            <div class="text-[10px] uppercase font-bold opacity-60">Precisión pase</div>
          </div>
          <div class="text-center px-2 py-3 bg-base-200 rounded-xl">
            <div class="text-xl font-black">
              <span v-if="summary.manOfTheMatch > 0" class="text-warning">{{ summary.manOfTheMatch }}</span>
              <span v-else class="opacity-30">0</span>
            </div>
            <div class="text-[10px] uppercase font-bold opacity-60">MVP</div>
          </div>

          <template v-if="isGoalkeeper">
            <div class="text-center px-2 py-3 bg-base-200 rounded-xl">
              <div class="text-xl font-black">{{ summary.saves }}</div>
              <div class="text-[10px] uppercase font-bold opacity-60">Paradas</div>
            </div>
            <div class="text-center px-2 py-3 bg-base-200 rounded-xl">
              <div class="text-xl font-black">{{ summary.cleanSheets }}</div>
              <div class="text-[10px] uppercase font-bold opacity-60">Portería a 0</div>
            </div>
            <div class="text-center px-2 py-3 bg-base-200 rounded-xl">
              <div class="text-xl font-black">{{ summary.goalsConceded }}</div>
              <div class="text-[10px] uppercase font-bold opacity-60">Goles encajados</div>
            </div>
          </template>
          <template v-else>
            <div class="text-center px-2 py-3 bg-base-200 rounded-xl">
              <div class="text-xl font-black">{{ summary.tacklesMade }}</div>
              <div class="text-[10px] uppercase font-bold opacity-60">Entradas</div>
            </div>
          </template>

          <div class="text-center px-2 py-3 bg-base-200 rounded-xl">
            <div class="text-xl font-black text-error">{{ summary.redCards || 0 }}</div>
            <div class="text-[10px] uppercase font-bold opacity-60">Rojas</div>
          </div>
          <div class="text-center px-2 py-3 bg-base-200 rounded-xl">
            <div class="text-xl font-black">{{ summary.minutesPlayed }}'</div>
            <div class="text-[10px] uppercase font-bold opacity-60">Minutos</div>
          </div>
        </div>
      </div>

      <!-- Historial de partidos -->
      <section>
        <h2 class="text-lg font-black mb-3">Historial de partidos</h2>
        <div v-if="!profile.matches.length" class="text-sm opacity-40 py-6 text-center border border-dashed border-base-300 rounded-xl">
          No hay partidos confirmados todavía.
        </div>
        <div v-else class="space-y-2">
          <a
            v-for="(m, i) in profile.matches" :key="i"
            :href="`/series?id=${m.seriesId}`"
            class="flex items-center gap-3 bg-base-100 hover:bg-base-200 transition-colors border border-base-300 rounded-xl px-4 py-3"
          >
            <span class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0" :class="resultBadge[m.result]">
              {{ resultLabel[m.result] }}
            </span>
            <TeamLogo size="sm" :url="teamLogo(m.playedTeam === 'A' ? m.teamAId : m.teamBId)" />
            <div class="flex-1 min-w-0">
              <div class="font-semibold truncate">
                vs {{ teamName(m.playedTeam === 'A' ? m.teamBId : m.teamAId) }}
              </div>
              <div class="text-xs opacity-40">{{ m.round }} · {{ translatePosition(m.stats.position) }}</div>
            </div>
            <div class="flex items-center gap-3 text-sm shrink-0">
              <span class="font-black tabular-nums">{{ m.scoreA }}-{{ m.scoreB }}</span>
              <span v-if="Number(m.stats.goals) > 0" title="Goles">⚽ {{ m.stats.goals }}</span>
              <span v-if="Number(m.stats.assists) > 0" title="Asistencias">🎯 {{ m.stats.assists }}</span>
              <span v-if="m.stats.manOfTheMatch" title="MVP">⭐</span>
              <span class="badge badge-sm" :class="Number(m.stats.rating) >= 7 ? 'badge-success' : Number(m.stats.rating) < 6 ? 'badge-error' : 'badge-ghost'">
                {{ Number(m.stats.rating).toFixed(1) }}
              </span>
            </div>
          </a>
        </div>
      </section>
    </div>
  </div>
</template>
