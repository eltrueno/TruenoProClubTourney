<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type {ISeries, ITeam, IKnockoutStageConfig } from '@trueno-proclub-tourney/shared';
import { teamBadge } from '@/lib/api';
import TeamLogo from '@/components/ui/TeamLogo.vue';

const props = defineProps<{
  stageId: string;
  stageName: string;
  stageConfig: IKnockoutStageConfig;
  series: ISeries[];
  teams: Record<string, ITeam>;
}>();

const roundOrder = computed(() => props.stageConfig?.rounds || []);

const rounds = computed(() => {
  const byRound = new Map<string, ISeries[]>();

  for (const s of props.series) {
    if (s.stageId !== props.stageId) continue;

    if (!byRound.has(s.round)) {
      byRound.set(s.round, []);
    }

    byRound.get(s.round)!.push(s);
  }

  return [...byRound.entries()]
    .sort(([a], [b]) => {
      const ia = roundOrder.value.indexOf(a);
      const ib = roundOrder.value.indexOf(b);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    })
    .map(([name, items]) => ({ name, items }));
});

// Mitad izquierda, final al centro, mitad derecha
const finalRound = computed(() => rounds.value.at(-1) ?? null);
const priorRounds = computed(() => rounds.value.slice(0, -1));

function splitHalf(items: ISeries[]) {
  const mid = Math.ceil(items.length / 2);
  return { left: items.slice(0, mid), right: items.slice(mid) };
}

const leftColumns = computed(() =>
  priorRounds.value.map((r) => ({ name: r.name, items: splitHalf(r.items).left }))
);
const rightColumns = computed(() =>
  [...priorRounds.value].reverse().map((r) => ({ name: r.name, items: splitHalf(r.items).right }))
);

const mobileActiveRound = ref<string | null>(null);
watch(rounds, () => {
  if (!mobileActiveRound.value && rounds.value.length) {
    mobileActiveRound.value = rounds.value[0].name;
  }
}, { immediate: true });

function badge(id: string | null) {
  const t = id ? props.teams[id] : undefined;
  return teamBadge(t);
}
function teamName(id: string | null) {
  const t = id ? props.teams[id] : undefined;
  return t?.name ?? null;
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

function seriesWinnerSide(series: ISeries): 'A' | 'B' | null {
  const score = seriesScore(series);
  if (!score) return null;
  if (score.a > score.b) return 'A';
  if (score.b > score.a) return 'B';
  return null;
}
</script>

<template>
  <div v-if="!rounds.length" class="text-center py-16 opacity-50">
    Todavía no hay cruces generados para esta fase
  </div>

  <template v-else>
    <!-- ==================== DESKTOP: Bracket clásico izq ← final → der ==================== -->
    <div class="hidden md:flex items-stretch justify-center pb-6 gap-6 p-4 bg-base-200/30 rounded-2xl w-full">

      <!-- Columnas izquierda -->
      <div v-for="(col, cIdx) in leftColumns" :key="'l-' + col.name"
        class="flex flex-col gap-2 relative flex-1 min-w-32.5 max-w-55 z-10">
        <h3 class="text-[10px] font-black uppercase tracking-wider text-center opacity-50 mb-1 shrink-0">
          {{ col.name }}
        </h3>
        <div class="flex flex-col flex-1 justify-around relative" :style="{ gap: `${Math.pow(2, cIdx) * 16}px` }">
          <div v-for="(s, idx) in col.items" :key="s.id" class="relative flex flex-col justify-center">
            <!-- Conector izquierdo de entrada (excepto primera columna) -->
            <div v-if="cIdx > 0" class="absolute top-1/2 -left-3 w-3 border-t-2 border-base-300"></div>

            <a :href="`/series?id=${s.id}`" data-astro-reload
              class="flex flex-col bg-base-100 rounded-lg border shadow-sm hover:border-primary transition-colors overflow-hidden relative z-10"
              :class="{
                'border-success': s.status === 'completed',
                'border-warning': s.status === 'in_progress',
                'border-base-300': s.status === 'pending'
              }">
              <!-- Team A -->
              <div class="flex items-center justify-between px-2 py-1 gap-1 border-b border-base-200/50"
                :class="{ 'font-bold': seriesWinnerSide(s) === 'A', 'opacity-40': seriesWinnerSide(s) === 'B' }">
                <TeamLogo size="sm" :url="badge(teamId(s.teamA))" />
                <span class="text-xs font-bold tabular-nums">{{ seriesScore(s)?.a ?? '-' }}</span>
              </div>
              <!-- Team B -->
              <div class="flex items-center justify-between px-2 py-1 gap-1"
                :class="{ 'font-bold': seriesWinnerSide(s) === 'B', 'opacity-40': seriesWinnerSide(s) === 'A' }">
                <TeamLogo size="sm" :url="badge(teamId(s.teamB))" />
                <span class="text-xs font-bold tabular-nums">{{ seriesScore(s)?.b ?? '-' }}</span>
              </div>
            </a>
            <!-- Conector derecho de salida hacia la siguiente columna -->
            <template v-if="cIdx < leftColumns.length">
              <div class="absolute top-1/2 -right-3 w-3 border-t-2 border-base-300"></div>
              <template v-if="cIdx < leftColumns.length - 1">
                <div v-if="idx % 2 === 0" class="absolute -right-3 top-1/2 border-r-2 border-base-300" :style="{ height: `calc(50% + ${Math.pow(2, cIdx) * 8}px + 1px)` }"></div>
                <div v-else class="absolute -right-3 border-r-2 border-base-300" :style="{ height: `calc(50% + ${Math.pow(2, cIdx) * 8}px + 1px)`, bottom: '50%' }"></div>
              </template>
            </template>
          </div>
        </div>
      </div>

      <!-- Conector entrada final izquierdo -->
      <div v-if="leftColumns.length" class="w-3 shrink-0 flex items-center">
        <div class="w-full border-t-2 border-base-300"></div>
      </div>

      <!-- FINAL -->
      <div v-if="finalRound" class="flex flex-col gap-2 relative flex-1 min-w-35 max-w-60 z-10">
        <h3 class="text-[10px] font-black uppercase tracking-wider text-center bg-primary/10 text-primary rounded-full py-1 mb-1 shrink-0">
          🏆 {{ finalRound.name }}
        </h3>
        <div class="flex flex-col flex-1 justify-center relative">
          <div v-for="s in finalRound.items" :key="s.id" class="relative">
            <!-- Conectores de entrada a la final desde ambos lados -->
            <div v-if="leftColumns.length" class="absolute top-1/2 -left-3 w-3 border-t-2 border-base-300"></div>
            <div v-if="rightColumns.length" class="absolute top-1/2 -right-3 w-3 border-t-2 border-base-300"></div>
            
            <a :href="`/series?id=${s.id}`" data-astro-reload
              class="flex flex-col bg-base-100 rounded-lg border-2 border-primary/30 shadow-md hover:border-primary transition-colors overflow-hidden relative z-10">
              <div class="flex items-center justify-between px-3 py-1.5 gap-2 border-b border-base-200/50"
                :class="{ 'font-bold': seriesWinnerSide(s) === 'A', 'opacity-40': seriesWinnerSide(s) === 'B' }">
                <TeamLogo size="md" :url="badge(teamId(s.teamA))" />
                <span class="text-sm font-bold tabular-nums">{{ seriesScore(s)?.a ?? '-' }}</span>
              </div>
              <div class="flex items-center justify-between px-3 py-1.5 gap-2"
                :class="{ 'font-bold': seriesWinnerSide(s) === 'B', 'opacity-40': seriesWinnerSide(s) === 'A' }">
                <TeamLogo size="md" :url="badge(teamId(s.teamB))" />
                <span class="text-sm font-bold tabular-nums">{{ seriesScore(s)?.b ?? '-' }}</span>
              </div>
            </a>
          </div>
        </div>
      </div>

      <!-- Columnas derecha (espejadas) -->
      <div v-for="(col, cIdx) in rightColumns" :key="'r-' + col.name"
        class="flex flex-col gap-2 relative flex-1 min-w-32.5 max-w-55 z-10">
        <h3 class="text-[10px] font-black uppercase tracking-wider text-center opacity-50 mb-1 shrink-0">
          {{ col.name }}
        </h3>
        <div class="flex flex-col flex-1 justify-around relative" :style="{ gap: `${Math.pow(2, (rightColumns.length - 1 - cIdx)) * 16}px` }">
          <div v-for="(s, idx) in col.items" :key="s.id" class="relative flex flex-col justify-center">
            <!-- Conector derecho de entrada (excepto primera columna desde la derecha) -->
            <div v-if="cIdx > 0" class="absolute top-1/2 -right-3 w-3 border-t-2 border-base-300"></div>

            <a :href="`/series?id=${s.id}`" data-astro-reload
              class="flex flex-col bg-base-100 rounded-lg border shadow-sm hover:border-primary transition-colors overflow-hidden relative z-10"
              :class="{
                'border-success': s.status === 'completed',
                'border-warning': s.status === 'in_progress',
                'border-base-300': s.status === 'pending'
              }">
              <div class="flex items-center justify-between px-2 py-1 gap-1 border-b border-base-200/50"
                :class="{ 'font-bold': seriesWinnerSide(s) === 'A', 'opacity-40': seriesWinnerSide(s) === 'B' }">
                <TeamLogo size="sm" :url="badge(teamId(s.teamA))" />
                <span class="text-xs font-bold tabular-nums">{{ seriesScore(s)?.a ?? '-' }}</span>
              </div>
              <div class="flex items-center justify-between px-2 py-1 gap-1"
                :class="{ 'font-bold': seriesWinnerSide(s) === 'B', 'opacity-40': seriesWinnerSide(s) === 'A' }">
                <TeamLogo size="sm" :url="badge(teamId(s.teamB))" />
                <span class="text-xs font-bold tabular-nums">{{ seriesScore(s)?.b ?? '-' }}</span>
              </div>
            </a>
            <!-- Conector izquierdo de salida hacia la siguiente columna (centro) -->
            <template v-if="cIdx < rightColumns.length">
              <div class="absolute top-1/2 -left-3 w-3 border-t-2 border-base-300"></div>
              <template v-if="cIdx < rightColumns.length - 1">
                <div v-if="idx % 2 === 0" class="absolute -left-3 top-1/2 border-l-2 border-base-300" :style="{ height: `calc(50% + ${Math.pow(2, (rightColumns.length - 1 - cIdx)) * 8}px + 1px)` }"></div>
                <div v-else class="absolute -left-3 border-l-2 border-base-300" :style="{ height: `calc(50% + ${Math.pow(2, (rightColumns.length - 1 - cIdx)) * 8}px + 1px)`, bottom: '50%' }"></div>
              </template>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== MÓVIL: Pestañas por ronda ==================== -->
    <div class="md:hidden">
      <div class="tabs tabs-boxed bg-base-100 shadow-sm mb-4 overflow-x-auto flex-nowrap">
        <a v-for="r in rounds" :key="r.name" class="tab whitespace-nowrap"
          :class="{ 'tab-active font-bold': mobileActiveRound === r.name }"
          @click="mobileActiveRound = r.name">
          {{ r.name }}
        </a>
      </div>

      <div class="flex flex-col gap-3">
        <div v-for="s in (rounds.find((r) => r.name === mobileActiveRound)?.items ?? [])" :key="s.id"
          class="card bg-base-100 shadow-sm border-l-4"
          :class="{
            'border-success': s.status === 'completed',
            'border-warning': s.status === 'in_progress',
            'border-base-300': s.status === 'pending',
          }">
          <div class="card-body py-3 px-4 gap-2">
            <div v-for="side in (['A', 'B'] as const)" :key="side" class="flex items-center justify-between gap-2">
              <a v-if="teamId(side === 'A' ? s.teamA : s.teamB)"
                :href="`/equipo?id=${teamId(side === 'A' ? s.teamA : s.teamB)}`" data-astro-reload
                class="flex items-center gap-2 min-w-0 hover:underline"
                :class="{ 'font-black': seriesWinnerSide(s) === side, 'opacity-60': seriesWinnerSide(s) && seriesWinnerSide(s) !== side }">
                <TeamLogo size="sm" :url="badge(teamId(side === 'A' ? s.teamA : s.teamB))" />
                <span class="truncate text-sm">{{ teamName(teamId(side === 'A' ? s.teamA : s.teamB)) }}</span>
              </a>
              <span v-else class="text-sm italic opacity-40">Por determinar</span>
              <span class="font-bold tabular-nums shrink-0" :class="{ 'text-success': seriesWinnerSide(s) === side }">
                {{ side === 'A' ? (seriesScore(s)?.a ?? '-') : (seriesScore(s)?.b ?? '-') }}
              </span>
            </div>
            <div class="flex items-center justify-between mt-1 pt-1 border-t border-base-200">
              <span class="badge badge-xs" :class="{
                'badge-ghost': s.status === 'pending',
                'badge-warning': s.status === 'in_progress',
                'badge-success': s.status === 'completed',
              }">
                {{ s.bestOf === 3 ? 'Al mejor de 3' : 'Partido único' }}
              </span>
              <a :href="`/series?id=${s.id}`" class="link link-primary text-xs">Ver →</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>
</template>
