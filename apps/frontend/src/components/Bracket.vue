<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import type { ISeries, ITeam, IGroupStanding } from '@trueno-proclub-tourney/shared';
import { api, teamBadge, flagUrl } from '../lib/api';

// ── datos ────────────────────────────────────────────────────────────────────
const series   = ref<ISeries[]>([]);
const teams    = ref<Record<string, ITeam>>({});
const loading  = ref(true);
const error    = ref<string | null>(null);

// standings: stageId → grupo → filas
const standingsByStage = ref<Record<string, Record<string, IGroupStanding[]>>>({});

onMounted(async () => {
  try {
    const [s, t] = await Promise.all([api.getSeries(), api.getTeams()]);
    series.value = s;
    teams.value = Object.fromEntries(t.map((t) => [t.id, t]));

    // Cargar standings de todas las fases de grupos
    const groupStageIds = [...new Set(s.filter(x => x.stageType === 'groups').map(x => x.stageId))];
    const results = await Promise.all(groupStageIds.map(id => api.getStandings(id).then(r => [id, r] as const)));
    standingsByStage.value = Object.fromEntries(results);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error cargando';
  } finally {
    loading.value = false;
  }
});

// ── cómputos ─────────────────────────────────────────────────────────────────
const stages = computed(() => {
  const map = new Map<string, { stageId: string; stageType: string; stageName?: string; rounds: Map<string, ISeries[]> }>();
  for (const s of series.value) {
    if (!map.has(s.stageId)) map.set(s.stageId, { stageId: s.stageId, stageType: s.stageType, rounds: new Map() });
    const stage = map.get(s.stageId)!;
    if (!stage.rounds.has(s.round)) stage.rounds.set(s.round, []);
    stage.rounds.get(s.round)!.push(s);
  }
  return Array.from(map.values());
});

const activeTab = ref<string | null>(null);
onMounted(() => {
  if (stages.value.length) activeTab.value = stages.value[0].stageId;
});

// ── helpers ───────────────────────────────────────────────────────────────────
function team(id: string | null): ITeam | undefined { return id ? teams.value[id] : undefined; }
function teamName(id: string | null) { return team(id)?.name ?? 'Por determinar'; }
function badge(id: string | null) { return teamBadge(team(id)); }

/** Victorias en la serie por equipo */
function seriesWins(s: ISeries): [number, number] {
  const confirmed = s.matches.filter(m => m.status === 'confirmed');
  let wA = 0, wB = 0;
  for (const m of confirmed) {
    const sA = m.effective.teamA?.score ?? 0;
    const sB = m.effective.teamB?.score ?? 0;
    const pA = m.effective.teamA?.penaltiesScore ?? 0;
    const pB = m.effective.teamB?.penaltiesScore ?? 0;
    if (sA > sB || (sA === sB && pA > pB)) wA++;
    else wB++;
  }
  return [wA, wB];
}

function isWinner(s: ISeries, side: 'A' | 'B') {
  if (s.status !== 'completed') return false;
  const [wA, wB] = seriesWins(s);
  return side === 'A' ? wA > wB : wB > wA;
}

const statusLabel: Record<string, string> = { pending: 'Sin jugar', in_progress: 'En curso', completed: 'Finalizado' };
</script>

<template>
  <div>
    <div v-if="loading" class="flex justify-center py-20">
      <span class="loading loading-spinner loading-lg text-primary"></span>
    </div>
    <div v-else-if="error" class="alert alert-error">{{ error }}</div>
    <div v-else-if="!stages.length" class="text-center py-20 opacity-40">El torneo aún no ha comenzado.</div>

    <div v-else>
      <!-- Tabs de fases -->
      <div class="tabs tabs-boxed mb-8 gap-1">
        <button
          v-for="stage in stages" :key="stage.stageId"
          class="tab"
          :class="{ 'tab-active': activeTab === stage.stageId }"
          @click="activeTab = stage.stageId"
        >
          {{ stage.stageType === 'groups' ? '⚽ Fase de Grupos' : '🏆 Eliminatorias' }}
        </button>
      </div>

      <template v-for="stage in stages" :key="stage.stageId">
        <div v-show="activeTab === stage.stageId">

          <!-- ══ FASE DE GRUPOS ══════════════════════════════════════════════ -->
          <div v-if="stage.stageType === 'groups'" class="space-y-10">
            <div
              v-for="(rows, groupName) in standingsByStage[stage.stageId]"
              :key="groupName"
              class="space-y-4"
            >
              <h2 class="text-lg font-black tracking-tight flex items-center gap-2">
                <span class="inline-block w-2 h-6 rounded bg-primary"></span>
                Grupo {{ groupName }}
              </h2>

              <!-- Tabla de clasificación -->
              <div class="overflow-x-auto rounded-xl border border-base-300">
                <table class="table table-sm">
                  <thead>
                    <tr class="text-xs uppercase opacity-50">
                      <th class="w-6">#</th>
                      <th>Equipo</th>
                      <th class="text-center w-10">PJ</th>
                      <th class="text-center w-10">Pts</th>
                      <th class="text-center w-10">GF</th>
                      <th class="text-center w-10">GC</th>
                      <th class="text-center w-12">DG</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(row, i) in rows" :key="row.teamId"
                      class="hover:bg-base-200 transition-colors"
                      :class="{ 'border-l-2 border-success': i === 0, 'opacity-60': row.played === 0 }"
                    >
                      <td class="font-bold opacity-30 text-xs">{{ i + 1 }}</td>
                      <td>
                        <div class="flex items-center gap-3">
                          <img
                            v-if="badge(row.teamId)"
                            :src="badge(row.teamId)!"
                            class="w-7 h-7 object-contain rounded-sm shrink-0"
                          />
                          <div v-else class="w-7 h-7 rounded bg-base-300 shrink-0"></div>
                          <a :href="`/equipo?id=${row.teamId}`" class="font-semibold truncate hover:underline">{{ teamName(row.teamId) }}</a>
                          <span v-if="teams[row.teamId]?.captainName" class="text-xs opacity-40 hidden sm:inline">
                            {{ teams[row.teamId].captainName }}
                          </span>
                        </div>
                      </td>
                      <td class="text-center tabular-nums text-sm">{{ row.played }}</td>
                      <td class="text-center tabular-nums font-black text-base">{{ row.points }}</td>
                      <td class="text-center tabular-nums text-sm opacity-70">{{ row.goalsFor }}</td>
                      <td class="text-center tabular-nums text-sm opacity-70">{{ row.goalsAgainst }}</td>
                      <td class="text-center tabular-nums text-sm" :class="row.goalDiff > 0 ? 'text-success' : row.goalDiff < 0 ? 'text-error' : ''">
                        {{ row.goalDiff > 0 ? '+' : '' }}{{ row.goalDiff }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Partidos del grupo -->
              <div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                <template v-for="[, items] in stage.rounds" :key="'r'">
                  <a
                    v-for="s in items.filter(s => rows.some(r => r.teamId === s.teamA || r.teamId === s.teamB))"
                    :key="s.id"
                    :href="`/series?id=${s.id}`"
                    class="flex items-center gap-3 bg-base-100 hover:bg-base-200 transition-colors border border-base-300 rounded-xl px-4 py-3 group"
                  >
                    <!-- Equipo A -->
                    <div class="flex items-center gap-2 flex-1 min-w-0 justify-end">
                      <span class="truncate text-sm font-medium text-right" :class="isWinner(s, 'A') ? 'font-black' : isWinner(s, 'B') ? 'opacity-40' : ''">
                        {{ teamName(s.teamA) }}
                      </span>
                      <img v-if="badge(s.teamA)" :src="badge(s.teamA)!" class="w-6 h-6 object-contain shrink-0" />
                    </div>
                    <!-- Marcador -->
                    <div class="shrink-0 text-center min-w-[3.5rem]">
                      <span v-if="s.status !== 'pending'" class="font-black tabular-nums text-sm">
                        {{ seriesWins(s)[0] }} – {{ seriesWins(s)[1] }}
                      </span>
                      <span v-else class="text-xs opacity-30 font-mono">vs</span>
                    </div>
                    <!-- Equipo B -->
                    <div class="flex items-center gap-2 flex-1 min-w-0">
                      <img v-if="badge(s.teamB)" :src="badge(s.teamB)!" class="w-6 h-6 object-contain shrink-0" />
                      <span class="truncate text-sm font-medium" :class="isWinner(s, 'B') ? 'font-black' : isWinner(s, 'A') ? 'opacity-40' : ''">
                        {{ teamName(s.teamB) }}
                      </span>
                    </div>
                    <span class="badge badge-xs shrink-0" :class="s.status === 'completed' ? 'badge-success' : s.status === 'in_progress' ? 'badge-warning' : 'badge-ghost'">
                      {{ statusLabel[s.status] ?? s.status }}
                    </span>
                  </a>
                </template>
              </div>
            </div>
          </div>

          <!-- ══ ELIMINATORIAS ═══════════════════════════════════════════════ -->
          <div v-else-if="stage.stageType === 'knockout'" class="overflow-x-auto pb-4">
            <div class="flex gap-6 min-w-max">
              <div
                v-for="[roundName, items] in stage.rounds" :key="roundName"
                class="flex flex-col gap-3"
              >
                <h3 class="text-xs font-black uppercase tracking-widest text-center opacity-40 pb-1 border-b border-base-300">{{ roundName }}</h3>
                <!-- Espaciado visual tipo bracket: los partidos se separan más en rondas avanzadas -->
                <div class="flex flex-col" :style="{ gap: `${Math.max(1, Math.ceil(stage.rounds.size / 2)) * 0.5}rem` }">
                  <a
                    v-for="s in items" :key="s.id"
                    :href="`/series?id=${s.id}`"
                    class="block w-52 rounded-xl border border-base-300 bg-base-100 hover:border-primary hover:shadow-md transition-all overflow-hidden group"
                    :class="s.status === 'completed' ? 'border-success/30' : s.status === 'in_progress' ? 'border-warning/50' : ''"
                  >
                    <!-- Equipo A -->
                    <div
                      class="flex items-center gap-2 px-3 py-2 border-b border-base-300"
                      :class="isWinner(s, 'A') ? 'bg-success/10' : ''"
                    >
                      <img v-if="badge(s.teamA)" :src="badge(s.teamA)!" class="w-5 h-5 object-contain shrink-0" />
                      <div v-else class="w-5 h-5 rounded bg-base-300 shrink-0"></div>
                      <span class="flex-1 truncate text-sm" :class="isWinner(s, 'A') ? 'font-black' : isWinner(s, 'B') ? 'opacity-40' : 'font-medium'">
                        {{ teamName(s.teamA) }}
                      </span>
                      <span class="tabular-nums font-black text-sm shrink-0" :class="isWinner(s, 'A') ? 'text-success' : ''">
                        {{ s.status !== 'pending' ? seriesWins(s)[0] : '' }}
                      </span>
                    </div>
                    <!-- Equipo B -->
                    <div
                      class="flex items-center gap-2 px-3 py-2"
                      :class="isWinner(s, 'B') ? 'bg-success/10' : ''"
                    >
                      <img v-if="badge(s.teamB)" :src="badge(s.teamB)!" class="w-5 h-5 object-contain shrink-0" />
                      <div v-else class="w-5 h-5 rounded bg-base-300 shrink-0"></div>
                      <span class="flex-1 truncate text-sm" :class="isWinner(s, 'B') ? 'font-black' : isWinner(s, 'A') ? 'opacity-40' : 'font-medium'">
                        {{ teamName(s.teamB) }}
                      </span>
                      <span class="tabular-nums font-black text-sm shrink-0" :class="isWinner(s, 'B') ? 'text-success' : ''">
                        {{ s.status !== 'pending' ? seriesWins(s)[1] : '' }}
                      </span>
                    </div>
                  </a>
                </div>
              </div>
            </div>
          </div>

        </div>
      </template>
    </div>
  </div>
</template>
