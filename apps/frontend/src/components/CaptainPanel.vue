<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { ISeries } from '@trueno-pro-club-tourney/shared';
import { api } from '../lib/api';
import { getSession, type Session } from '../lib/auth';

const session = ref<Session | null>(null);
const series = ref<ISeries[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

onMounted(async () => {
  try {
    session.value = await getSession();
    if (!session.value) {
      loading.value = false;
      return;
    }
    series.value = await api.getMySeries();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error cargando tus partidos';
  } finally {
    loading.value = false;
  }
});

async function confirm(seriesId: string, position: number) {
  try {
    const updated = await api.confirmMatch(seriesId, position);
    series.value = series.value.map((s) => (s.id === seriesId ? updated : s));
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudo confirmar';
  }
}

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

  <div v-else-if="!session" class="alert">
    Inicia sesión con Twitch desde la web principal para ver tu panel de capitán.
  </div>

  <div v-else class="space-y-4">
    <div v-if="error" class="alert alert-error">{{ error }}</div>

    <div v-if="series.length === 0" class="opacity-60">No tienes partidos pendientes ahora mismo.</div>

    <div v-for="s in series" :key="s.id" class="card bg-base-100 shadow-sm">
      <div class="card-body">
        <h3 class="font-bold">{{ s.round }}</h3>

        <div v-for="match in s.matches" :key="match.position" class="flex items-center justify-between border-t py-2">
          <div>
            <span class="font-medium">Partida {{ match.position }}</span>
            <span class="badge ml-2" :class="statusBadge[match.status]">{{ match.status.replace('_', ' ') }}</span>
            <div v-if="match.effective.scoreA != null" class="text-sm opacity-70">
              {{ match.effective.scoreA }} - {{ match.effective.scoreB }}
            </div>
          </div>

          <div class="flex gap-2">
            <button v-if="match.status === 'sin_seleccionar'" class="btn btn-sm btn-primary" disabled>
              Añadir partido (pendiente de integrar API de EA)
            </button>

            <template v-else-if="match.status === 'pendiente_confirmacion'">
              <button class="btn btn-sm btn-success" @click="confirm(s.id, match.position)">
                Todo correcto
              </button>
              <button class="btn btn-sm btn-outline">Algo no cuadra</button>
            </template>

            <span v-else-if="match.status === 'disputado'" class="text-sm text-error">
              En disputa, lo revisa un admin
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
