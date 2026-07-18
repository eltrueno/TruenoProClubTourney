<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '@/lib/api';
import { useApi } from '@/composables/useApi';

const { data: disputes, loading, error, execute: load } = useApi(api.series.admin.listDisputes);
const { execute: resolve } = useApi(api.series.admin.resolveDispute);
onMounted(load);

const scores = ref<Record<string, { a: number; b: number; penA: number | null; penB: number | null }>>({});

function key(seriesId: string, position: number) { return `${seriesId}-${position}`; }

async function submitResolve(seriesId: string, position: number) {
  const k = key(seriesId, position);
  const s = scores.value[k];
  if (!s) return;
  await resolve(seriesId, position, {
    teamA: { score: s.a, penaltiesScore: s.penA },
    teamB: { score: s.b, penaltiesScore: s.penB }
  });
  await load();
}
</script>

<template>
  <div v-if="loading" class="flex justify-center py-8"><span class="loading loading-spinner"></span></div>
  <div v-else-if="error" class="alert alert-error">{{ error.message }}</div>
  <div v-else-if="!disputes?.length" class="text-center py-12 opacity-50">No hay disputas pendientes 🎉</div>
  <div v-else class="space-y-3">
    <div v-for="d in disputes" :key="key(d.seriesId, d.position)" class="card bg-base-100 shadow-sm border-l-2 border-error">
      <div class="card-body py-3 px-4">
        <p class="text-sm font-medium">{{ d.round }}<span v-if="d.bestOf > 1"> — Partida {{ d.position }}</span></p>
        <p class="text-xs opacity-50 mb-2">{{ d.teamA?.name }} vs {{ d.teamB?.name }}</p>

        <div class="grid sm:grid-cols-2 gap-2 text-xs mb-3">
          <div class="bg-base-200 rounded p-2">
            <p class="opacity-50">Reportó {{ d.teamA?.name }}</p>
            <div v-if="d.confirmations?.byTeamA" class="font-bold">
              {{ d.confirmations.byTeamA.teamA.score }}<span v-if="d.confirmations.byTeamA.teamA.penaltiesScore != null"> ({{ d.confirmations.byTeamA.teamA.penaltiesScore }})</span>
              – 
              {{ d.confirmations.byTeamA.teamB.score }}<span v-if="d.confirmations.byTeamA.teamB.penaltiesScore != null"> ({{ d.confirmations.byTeamA.teamB.penaltiesScore }})</span>
            </div>
            <p v-else class="opacity-40">Sin reportar</p>
          </div>
          <div class="bg-base-200 rounded p-2">
            <p class="opacity-50">Reportó {{ d.teamB?.name }}</p>
            <div v-if="d.confirmations?.byTeamB" class="font-bold">
              {{ d.confirmations.byTeamB.teamA.score }}<span v-if="d.confirmations.byTeamB.teamA.penaltiesScore != null"> ({{ d.confirmations.byTeamB.teamA.penaltiesScore }})</span>
              – 
              {{ d.confirmations.byTeamB.teamB.score }}<span v-if="d.confirmations.byTeamB.teamB.penaltiesScore != null"> ({{ d.confirmations.byTeamB.teamB.penaltiesScore }})</span>
            </div>
            <p v-else class="opacity-40">Sin reportar</p>
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <span class="text-xs opacity-50">Marcador definitivo:</span>
          <div class="flex items-center gap-2">
            <input type="number" min="0" class="input input-bordered input-xs w-12" placeholder="Goles A"
              @input="scores[key(d.seriesId, d.position)] = { ...(scores[key(d.seriesId, d.position)] ?? { a: 0, b: 0, penA: null, penB: null }), a: Number(($event.target as HTMLInputElement).value) }" />
            <input type="number" min="0" class="input input-bordered input-xs w-12" placeholder="Pen A"
              @input="scores[key(d.seriesId, d.position)] = { ...(scores[key(d.seriesId, d.position)] ?? { a: 0, b: 0, penA: null, penB: null }), penA: ($event.target as HTMLInputElement).value ? Number(($event.target as HTMLInputElement).value) : null }" />
            <span>–</span>
            <input type="number" min="0" class="input input-bordered input-xs w-12" placeholder="Goles B"
              @input="scores[key(d.seriesId, d.position)] = { ...(scores[key(d.seriesId, d.position)] ?? { a: 0, b: 0, penA: null, penB: null }), b: Number(($event.target as HTMLInputElement).value) }" />
            <input type="number" min="0" class="input input-bordered input-xs w-12" placeholder="Pen B"
              @input="scores[key(d.seriesId, d.position)] = { ...(scores[key(d.seriesId, d.position)] ?? { a: 0, b: 0, penA: null, penB: null }), penB: ($event.target as HTMLInputElement).value ? Number(($event.target as HTMLInputElement).value) : null }" />
            <button class="btn btn-xs btn-primary ml-2" @click="submitResolve(d.seriesId, d.position)">Fijar resultado</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
