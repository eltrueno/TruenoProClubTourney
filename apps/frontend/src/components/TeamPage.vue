<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import type { ISeries, ITeam } from '@trueno-proclub-tourney/shared';
import { api, teamBadge } from '../lib/api';
import { translateApiError } from '../i18n/translations';
import AppError from './Error.vue';
import Loader from '@/components/layout/Loader.vue';

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
    error.value = translateApiError(e);
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

const teamStats = computed(() => {
  let goalsFor = 0;
  let goalsAgainst = 0;
  let wins = 0;
  let losses = 0;
  let ties = 0;

  for (const s of playedSeries.value) {
    const confirmed = s.matches.filter((m) => m.status === 'confirmed');
    for (const m of confirmed) {
      const isA = getTeamId(s.teamA) === teamId.value;
      const myScore = isA ? (m.effective.teamA?.score ?? 0) : (m.effective.teamB?.score ?? 0);
      const theirScore = isA ? (m.effective.teamB?.score ?? 0) : (m.effective.teamA?.score ?? 0);
      const myPen = isA ? (m.effective.teamA?.penaltiesScore ?? 0) : (m.effective.teamB?.penaltiesScore ?? 0);
      const theirPen = isA ? (m.effective.teamB?.penaltiesScore ?? 0) : (m.effective.teamA?.penaltiesScore ?? 0);

      goalsFor += myScore;
      goalsAgainst += theirScore;

      if (myScore > theirScore || (myScore === theirScore && myPen > theirPen)) wins++;
      else if (myScore < theirScore || (myScore === theirScore && myPen < theirPen)) losses++;
      else ties++;
    }
  }

  return { goalsFor, goalsAgainst, wins, losses, ties, matchesPlayed: wins + losses + ties };
});

const teamPlayers = computed(() => {
  const players = new Map<string, any>();

  for (const s of playedSeries.value) {
    const confirmed = s.matches.filter((m) => m.status === 'confirmed');
    for (const m of confirmed) {
      const isA = getTeamId(s.teamA) === teamId.value;
      const teamPlayersData = isA ? m.effective.teamA?.players : m.effective.teamB?.players;

      if (!teamPlayersData) continue;

      for (const p of teamPlayersData) {
        if (!players.has(p.eaId)) {
          players.set(p.eaId, {
            eaId: p.eaId,
            name: p.name,
            matchesPlayed: 0,
            goals: 0,
            assists: 0,
            ratingSum: 0,
            redCards: 0,
            motm: 0,
          });
        }
        const st = players.get(p.eaId)!;
        st.name = p.name;
        st.matchesPlayed++;
        st.goals += Number(p.goals) || 0;
        st.assists += Number(p.assists) || 0;
        st.ratingSum += Number(p.rating) || 0;
        st.redCards += Number(p.redCards) || 0;
        st.motm += p.manOfTheMatch ? 1 : 0;
      }
    }
  }

  const result = Array.from(players.values()).map(p => ({
    ...p,
    avgRating: p.matchesPlayed > 0 ? (p.ratingSum / p.matchesPlayed).toFixed(1) : '0.0'
  }));
  result.sort((a, b) => b.goals - a.goals || Number(b.avgRating) - Number(a.avgRating));
  return result;
});
</script>

<template>
  <div>
    <div v-if="loading" class="flex justify-center py-20">
      <Loader />
    </div>
  <AppError v-else-if="error || !team" :error="error ?? 'Equipo no encontrado'" />

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
      
      <!-- Stats Summary Card -->
      <div class="ml-auto hidden sm:flex gap-4 items-center">
        <div class="text-center px-4 py-2 bg-base-200 rounded-xl">
          <div class="text-2xl font-black">{{ teamStats.matchesPlayed }}</div>
          <div class="text-[10px] uppercase font-bold opacity-60">Partidos</div>
        </div>
        <div class="text-center px-4 py-2 bg-base-200 rounded-xl">
          <div class="text-2xl font-black text-success">{{ teamStats.wins }}</div>
          <div class="text-[10px] uppercase font-bold opacity-60">Victorias</div>
        </div>
        <div class="text-center px-4 py-2 bg-base-200 rounded-xl">
          <div class="text-2xl font-black text-error">{{ teamStats.losses }}</div>
          <div class="text-[10px] uppercase font-bold opacity-60">Derrotas</div>
        </div>
        <div class="text-center px-4 py-2 bg-base-200 rounded-xl">
          <div class="text-2xl font-black">
            <span class="text-success">{{ teamStats.goalsFor }}</span><span class="opacity-30 mx-1">-</span><span class="text-error">{{ teamStats.goalsAgainst }}</span>
          </div>
          <div class="text-[10px] uppercase font-bold opacity-60">Goles</div>
        </div>
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

    <!-- Jugadores del Equipo -->
    <section v-if="teamPlayers.length">
      <h2 class="text-lg font-black mb-3">Plantilla (Estadísticas en este equipo)</h2>
      <div class="overflow-x-auto bg-base-100 border border-base-300 rounded-xl shadow-sm">
        <table class="table table-sm">
          <thead>
            <tr>
              <th>Jugador</th>
              <th class="text-center">PJ</th>
              <th class="text-center">Goles</th>
              <th class="text-center">Asist</th>
              <th class="text-center">MVP</th>
              <th class="text-center">Rojas</th>
              <th class="text-center">Media</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in teamPlayers" :key="p.eaId" class="hover">
              <td class="font-semibold">{{ p.name }}</td>
              <td class="text-center">{{ p.matchesPlayed }}</td>
              <td class="text-center font-bold">{{ p.goals }}</td>
              <td class="text-center">{{ p.assists }}</td>
              <td class="text-center">
                <span v-if="p.motm > 0" class="badge badge-warning badge-xs">{{ p.motm }}</span>
                <span v-else class="opacity-20">-</span>
              </td>
              <td class="text-center text-error">{{ p.redCards || '-' }}</td>
              <td class="text-center">
                <span class="badge badge-sm" :class="Number(p.avgRating) >= 7 ? 'badge-success' : Number(p.avgRating) < 6 ? 'badge-error' : 'badge-ghost'">
                  {{ p.avgRating }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

  </div>
  </div>
</template>
