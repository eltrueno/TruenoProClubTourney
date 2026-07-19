<script setup lang="ts">
import { ref, computed } from 'vue';
import type {ISeries, ITeam } from '@trueno-proclub-tourney/shared';
import { teamBadge } from '@/lib/api';


const props = defineProps<{
  stageId: string;
  stageName: string;
  series: ISeries[];
  teams: Record<string, ITeam>;
}>();

// Rondas en el orden declarado en la config, solo las que ya tienen series
const roundOrder = [
  'Preliminar',
  'Dieciseisavos',
  'Octavos',
  'Cuartos',
  'Semifinal',
  'Tercer puesto',
  'Final',
];

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
      const ia = roundOrder.indexOf(a);
      const ib = roundOrder.indexOf(b);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    })
    .map(([name, items]) => ({ name, items }));
});

// La última ronda con datos es la final (o lo más parecido a ella).
// Todo lo anterior se reparte en mitad izquierda / mitad derecha por índice.
const finalRound = computed(() => rounds.value.at(-1) ?? null);
const priorRounds = computed(() => rounds.value.slice(0, -1));

function splitHalf(items: ISeries[]) {
  const mid = Math.ceil(items.length / 2);
  return { left: items.slice(0, mid), right: items.slice(mid) };
}

const leftColumns = computed(() => priorRounds.value.map((r) => ({ name: r.name, items: splitHalf(r.items).left })));
// El lado derecho se pinta en espejo: la ronda más cercana a la final va pegada al centro
const rightColumns = computed(() =>
  [...priorRounds.value].reverse().map((r) => ({ name: r.name, items: splitHalf(r.items).right }))
);

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
    <!-- Desktop / tablet: bracket partido en mitad izquierda, final al centro, mitad derecha -->
    <div class="hidden md:flex items-center justify-center gap-4 overflow-x-auto pb-4">
      <div v-for="col in leftColumns" :key="'l-' + col.name" class="flex flex-col gap-4 w-52 shrink-0">
        <h3 class="text-xs font-bold uppercase tracking-wider text-center bg-base-100 rounded-full py-1.5 shadow-sm">
          {{ col.name }}
        </h3>
        <div class="flex flex-col gap-6 flex-1 justify-around">
          <div v-for="s in col.items" :key="s.id" class="card bg-base-100 shadow-sm border-l-4"
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
              <a :href="`/series?id=${s.id}`" class="link link-primary text-xs mt-1 self-end">Ver →</a>
            </div>
          </div>
        </div>
      </div>

      <!-- Final, al centro -->
      <div v-if="finalRound" class="flex flex-col gap-4 w-60 shrink-0">
        <h3 class="text-sm font-black uppercase tracking-wider text-center bg-primary text-primary-content rounded-full py-1.5 shadow-sm">
          🏆 {{ finalRound.name }}
        </h3>
        <div class="flex flex-col gap-6 flex-1 justify-center">
          <div v-for="s in finalRound.items" :key="s.id" class="card bg-base-100 shadow-md border-2 border-primary/40">
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
              <a :href="`/series?id=${s.id}`" class="link link-primary text-xs mt-1 self-end">Ver →</a>
            </div>
          </div>
        </div>
      </div>

      <div v-for="col in rightColumns" :key="'r-' + col.name" class="flex flex-col gap-4 w-52 shrink-0">
        <h3 class="text-xs font-bold uppercase tracking-wider text-center bg-base-100 rounded-full py-1.5 shadow-sm">
          {{ col.name }}
        </h3>
        <div class="flex flex-col gap-6 flex-1 justify-around">
          <div v-for="s in col.items" :key="s.id" class="card bg-base-100 shadow-sm border-r-4"
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
              <a :href="`/series?id=${s.id}`" class="link link-primary text-xs mt-1 self-end">Ver →</a>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Móvil: selector de ronda + lista vertical, el bracket partido no cabe bien en pantalla estrecha -->
    <div class="md:hidden">
      <div class="tabs tabs-boxed bg-base-100 shadow-sm mb-4 overflow-x-auto flex-nowrap">
        <a v-for="r in rounds" :key="r.name" class="tab whitespace-nowrap"
          :class="{ 'tab-active font-bold': mobileActiveRound === r.name }"
          @click="mobileActiveRound = r.name">
          {{ r.name === finalRound?.name ? '🏆 ' + r.name : r.name }}
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
