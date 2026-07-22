<script setup lang="ts">
import { ref, computed } from 'vue';
import type {ISeries, ITeam, IKnockoutStageConfig } from '@trueno-proclub-tourney/shared';
import { teamBadge } from '@/lib/api';

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

const mobileActiveRound = ref<string | null>(null);
function ensureMobileRound() {
  if (!mobileActiveRound.value && rounds.value.length) mobileActiveRound.value = rounds.value[0].name;
}
ensureMobileRound();

function team(id: string | null): ITeam | undefined {
  return id ? props.teams[id] : undefined;
}
function teamName(id: string | null) {
  return id ? (team(id)?.name ?? '...') : 'Por determinar';
}
function badge(id: string | null) {
  return teamBadge(team(id));
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
    <!-- Desktop: Bracket estilo clásico de izquierda a derecha con líneas conectables -->
    <div class="hidden md:flex items-stretch overflow-x-auto pb-8 gap-8 p-4 bg-base-200/30 rounded-2xl">
      <div v-for="(round, rIdx) in rounds" :key="round.name" class="flex flex-col justify-around gap-2 w-48 shrink-0 relative">
        <h3 class="text-xs font-black uppercase tracking-wider text-center bg-base-100 rounded-full py-1.5 shadow-sm mb-2 opacity-70">
          {{ round.name }}
        </h3>
        
        <div v-for="(s, idx) in round.items" :key="s.id" class="relative flex-1 flex flex-col justify-center">
          <div class="card bg-base-100 shadow-sm border z-10 hover:border-primary transition-colors duration-200"
            :class="{
              'border-success': s.status === 'completed',
              'border-warning': s.status === 'in_progress',
              'border-base-300': s.status === 'pending'
            }">
            <div class="p-2 gap-1 text-xs">
              <div class="flex items-center justify-between gap-1 h-6">
                <div class="flex items-center gap-1.5 overflow-hidden" :class="{'font-bold': seriesWinnerSide(s) === 'A', 'opacity-50': seriesWinnerSide(s) === 'B'}">
                  <img v-if="badge(teamId(s.teamA))" :src="badge(teamId(s.teamA))!" class="w-4 h-4 object-contain shrink-0" />
                  <div v-else class="w-4 h-4 rounded-full bg-base-300 shrink-0"></div>
                  <span class="truncate">{{ teamName(teamId(s.teamA)) }}</span>
                </div>
                <span class="font-bold shrink-0">{{ seriesScore(s)?.a ?? '-' }}</span>
              </div>
              <div class="flex items-center justify-between gap-1 h-6">
                <div class="flex items-center gap-1.5 overflow-hidden" :class="{'font-bold': seriesWinnerSide(s) === 'B', 'opacity-50': seriesWinnerSide(s) === 'A'}">
                  <img v-if="badge(teamId(s.teamB))" :src="badge(teamId(s.teamB))!" class="w-4 h-4 object-contain shrink-0" />
                  <div v-else class="w-4 h-4 rounded-full bg-base-300 shrink-0"></div>
                  <span class="truncate">{{ teamName(teamId(s.teamB)) }}</span>
                </div>
                <span class="font-bold shrink-0">{{ seriesScore(s)?.b ?? '-' }}</span>
              </div>
            </div>
            <a :href="`/series?id=${s.id}`" class="absolute inset-0 z-20" aria-label="Ver partido"></a>
          </div>

          <!-- Caminos / Conectores -->
          <template v-if="rIdx < rounds.length - 1">
            <div class="absolute right-[-1rem] border-r-2 border-base-300"
              :class="idx % 2 === 0 ? 'top-1/2 bottom-[-0.25rem] rounded-tr-lg' : 'top-[-0.25rem] bottom-1/2 rounded-br-lg'"></div>
            <div class="absolute right-[-1rem] w-4 border-t-2 border-base-300 top-1/2"></div>
            <div v-if="idx % 2 === 0" class="absolute right-[-2rem] w-4 border-t-2 border-base-300 top-[calc(100%+0.25rem)]"></div>
          </template>
          <div v-if="rIdx > 0" class="absolute left-[-1rem] w-4 border-t-2 border-base-300 top-1/2"></div>
        </div>
      </div>
    </div>

    <!-- Móvil: Pestañas por ronda -->
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
                :href="`/equipo?id=${teamId(side === 'A' ? s.teamA : s.teamB)}`"
                class="flex items-center gap-2 min-w-0 hover:underline"
                :class="{ 'font-black': seriesWinnerSide(s) === side, 'opacity-60': seriesWinnerSide(s) && seriesWinnerSide(s) !== side }">
                <img v-if="badge(teamId(side === 'A' ? s.teamA : s.teamB))" :src="badge(teamId(side === 'A' ? s.teamA : s.teamB))!" class="w-5 h-5 object-contain shrink-0" />
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
