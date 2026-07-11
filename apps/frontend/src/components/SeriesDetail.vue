<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { ISeries } from '@trueno-pro-club-tourney/shared';
import { api } from '../lib/api';

const series = ref<ISeries | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

onMounted(async () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  if (!id) {
    error.value = 'Falta el parámetro ?id= en la URL';
    loading.value = false;
    return;
  }

  try {
    series.value = await api.getSeriesById(id);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error cargando la serie';
  } finally {
    loading.value = false;
  }
});

const statusBadge: Record<string, string> = {
  sin_seleccionar: 'badge-ghost',
  pendiente_confirmacion: 'badge-warning',
  confirmado: 'badge-success',
  disputado: 'badge-error',
};
</script>

<template>
  <div v-if="loading" class="flex justify-center py-12">
    <span class="loading loading-spinner loading-lg"></span>
  </div>

  <div v-else-if="error" class="alert alert-error">{{ error }}</div>

  <div v-else-if="series" class="space-y-4">
    <h1 class="text-xl font-bold">{{ series.round }}</h1>

    <div class="grid gap-3">
      <div v-for="match in series.matches" :key="match.position" class="card bg-base-100 shadow-sm">
        <div class="card-body py-3 px-4">
          <div class="flex items-center justify-between">
            <span class="font-semibold">Partida {{ match.position }}</span>
            <span class="badge" :class="statusBadge[match.status]">{{ match.status.replace('_', ' ') }}</span>
          </div>

          <div v-if="match.effective.scoreA != null" class="text-lg mt-1">
            {{ match.effective.scoreA }} - {{ match.effective.scoreB }}
          </div>
          <div v-else class="text-sm opacity-60 mt-1">Sin resultado todavía</div>
        </div>
      </div>
    </div>
  </div>
</template>
