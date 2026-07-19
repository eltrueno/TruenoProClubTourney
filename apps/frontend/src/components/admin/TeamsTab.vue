<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '@/lib/api';
import { useApi } from '@/composables/useApi';
import AppError from '@/components/Error.vue';
import { translateApiError } from '@/i18n/translations';

const { data: teams, loading, error, execute: loadTeams } = useApi(api.teams.getAll);
const { loading: creating, error: createError, execute: create } = useApi(api.teams.admin.create);
const { execute: assign } = useApi(api.teams.admin.assignCaptain);
const { execute: unassign } = useApi(api.teams.admin.removeCaptain);

onMounted(loadTeams);

const form = ref({ name: '', countryCode: '', logoUrl: '', group: '' });
const captainInputs = ref<Record<string, string>>({});
const assigningTeamId = ref<string | null>(null);
const assignError = ref<Record<string, string>>({});

async function submitCreate() {
  const body: any = { name: form.value.name, group: form.value.group || undefined };
  if (form.value.countryCode) body.countryCode = form.value.countryCode;
  if (form.value.logoUrl) body.logoUrl = form.value.logoUrl;

  const created = await create(body);
  if (created) {
    form.value = { name: '', countryCode: '', logoUrl: '', group: '' };
    await loadTeams();
  }
}

async function submitCaptain(teamId: string) {
  const userId = captainInputs.value[teamId]?.trim();
  if (!userId) return;
  assigningTeamId.value = teamId;
  assignError.value[teamId] = '';
  const result = await assign(teamId, userId);
  if (!result) {
    assignError.value[teamId] = 'No se pudo asignar (revisa el userId)';
  } else {
    captainInputs.value[teamId] = '';
  }
  assigningTeamId.value = null;
  await loadTeams();
}

async function removeCaptainFor(teamId: string) {
  if (!window.confirm('¿Quitar el capitán de este equipo? El capitán actual perderá el acceso a su panel.')) return;
  await unassign(teamId);
  await loadTeams();
}

function formatDate(iso?: string) {
  if (!iso) return null;
  return new Date(iso).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' });
}
</script>

<template>
  <div class="space-y-6">
    <!-- Crear equipo -->
    <div class="card bg-base-100 shadow-sm">
      <div class="card-body">
        <h3 class="font-bold mb-2">Crear equipo</h3>
        <form @submit.prevent="submitCreate" class="grid sm:grid-cols-2 gap-3">
          <input v-model="form.name" placeholder="Nombre" required class="input input-bordered input-sm" />
          <input v-model="form.group" placeholder="Grupo (ej. A)" class="input input-bordered input-sm" />
          <input v-model="form.countryCode" placeholder="Código país (ej. es) — selecciones" class="input input-bordered input-sm" />
          <input v-model="form.logoUrl" placeholder="URL del escudo — clubes" class="input input-bordered input-sm" />
          <button type="submit" class="btn btn-primary btn-sm sm:col-span-2" :disabled="creating">
            {{ creating ? 'Creando...' : 'Crear equipo' }}
          </button>
        </form>
        <p v-if="createError" class="text-error text-sm mt-2">{{ createError.message }}</p>
      </div>
    </div>

    <!-- Listado -->
    <div v-if="loading" class="flex justify-center py-8"><span class="loading loading-spinner"></span></div>
    <AppError v-else-if="error" :error="translateApiError(error)" />
    <div v-else class="space-y-3">
      <div v-for="team in teams" :key="team.id" class="card bg-base-100 shadow-sm">
        <div class="card-body py-4 px-4 gap-3">
          <!-- Fila superior: identidad del equipo -->
          <div class="flex items-center justify-between flex-wrap gap-2">
            <div class="flex items-center gap-2">
              <img v-if="team.logoUrl || team.countryCode" :src="team.logoUrl ?? `https://flagcdn.com/${team.countryCode}.svg`" class="w-6 h-6 object-contain" />
              <span class="font-bold">{{ team.name }}</span>
              <span v-if="team.group" class="badge badge-ghost badge-sm">Grupo {{ team.group }}</span>
            </div>
          </div>

          <div class="grid sm:grid-cols-2 gap-3 border-t pt-3">
            <!-- Columna EA Club -->
            <div>
              <div class="text-xs font-bold opacity-60 mb-1">Club EA</div>
              <template v-if="team.eaClubId">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="badge badge-success badge-sm">{{ team.eaClubName ?? '(nombre no disponible)' }}</span>
                  <span class="font-mono text-xs opacity-60 bg-base-300 px-2 py-0.5 rounded">ID {{ team.eaClubId }}</span>
                </div>
                <div v-if="team.eaClubIdSetAt" class="text-xs opacity-50 mt-1">
                  Configurado el {{ formatDate(team.eaClubIdSetAt) }}
                </div>
              </template>
              <span v-else class="badge badge-ghost badge-sm">Sin eaClubId configurado</span>
            </div>

            <!-- Columna Capitán -->
            <div>
              <div class="text-xs font-bold opacity-60 mb-1">Capitán</div>
              <div v-if="team.captainName" class="flex items-center gap-2 flex-wrap mb-2">
                <span class="badge badge-primary badge-sm">{{ team.captainName }}</span>
                <button class="btn btn-xs btn-ghost text-error" @click="removeCaptainFor(team.id)">Quitar</button>
              </div>
              <div v-else class="text-xs opacity-50 mb-2">Sin capitán asignado</div>

              <div class="flex items-center gap-2">
                <input
                  v-model="captainInputs[team.id]"
                  placeholder="userId del capitán"
                  class="input input-bordered input-xs w-36"
                  @keyup.enter="submitCaptain(team.id)"
                />
                <button
                  class="btn btn-xs btn-primary"
                  :class="{ 'loading loading-spinner': assigningTeamId === team.id }"
                  :disabled="assigningTeamId === team.id"
                  @click="submitCaptain(team.id)"
                >
                  {{ team.captainName ? 'Reasignar' : 'Asignar' }}
                </button>
              </div>
              <p v-if="assignError[team.id]" class="text-error text-xs mt-1">{{ assignError[team.id] }}</p>
            </div>
          </div>
        </div>
      </div>

      <div v-if="teams && teams.length === 0" class="text-center py-8 opacity-50">
        Todavía no hay equipos creados.
      </div>
    </div>
  </div>
</template>
