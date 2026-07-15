<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '@/lib/api';
import { useApi } from '@/composables/useApi';

const { data: disputes, loading, error, execute: load } = useApi(api.listDisputes);
const { execute: resolve } = useApi(api.resolveDispute);
onMounted(load);

const scores = ref<Record<string, { a: number; b: number }>>({});

function key(seriesId: string, position: number) { return `${seriesId}-${position}`; }

async function submitResolve(seriesId: string, position: number) {
  const k = key(seriesId, position);
  const s = scores.value[k];
  if (!s) return;
  await resolve(seriesId, position, { scoreA: s.a, scoreB: s.b });
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
        <p class="text-sm font-medium">{{ d.round }} — Partida {{ d.position }}</p>
        <p class="text-xs opacity-50 mb-2">{{ d.teamA?.name }} vs {{ d.teamB?.name }}</p>

        <div class="grid sm:grid-cols-2 gap-2 text-xs mb-3">
          <div class="bg-base-200 rounded p-2">
            <p class="opacity-50">Reportó {{ d.teamA?.name }}</p>
            <p v-if="d.claims?.byTeamA" class="font-bold">{{ d.claims.byTeamA.scoreA }} – {{ d.claims.byTeamA.scoreB }}</p>
            <p v-else class="opacity-40">Sin reportar</p>
          </div>
          <div class="bg-base-200 rounded p-2">
            <p class="opacity-50">Reportó {{ d.teamB?.name }}</p>
            <p v-if="d.claims?.byTeamB" class="font-bold">{{ d.claims.byTeamB.scoreA }} – {{ d.claims.byTeamB.scoreB }}</p>
            <p v-else class="opacity-40">Sin reportar</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <span class="text-xs opacity-50">Marcador definitivo:</span>
          <input type="number" min="0" class="input input-bordered input-xs w-14"
            @input="scores[key(d.seriesId, d.position)] = { ...(scores[key(d.seriesId, d.position)] ?? { a: 0, b: 0 }), a: Number(($event.target as HTMLInputElement).value) }" />
          <span>–</span>
          <input type="number" min="0" class="input input-bordered input-xs w-14"
            @input="scores[key(d.seriesId, d.position)] = { ...(scores[key(d.seriesId, d.position)] ?? { a: 0, b: 0 }), b: Number(($event.target as HTMLInputElement).value) }" />
          <button class="btn btn-xs btn-primary" @click="submitResolve(d.seriesId, d.position)">Fijar resultado</button>
        </div>
      </div>
    </div>
  </div>
</template>
