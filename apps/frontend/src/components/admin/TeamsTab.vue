<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '@/lib/api';
import { useApi } from '@/composables/useApi';

const { data: teams, loading, error, execute: loadTeams } = useApi(api.getTeams);
const { loading: creating, error: createError, execute: create } = useApi(api.createTeam);
const { execute: assign } = useApi(api.assignCaptain);
const { execute: unassign } = useApi(api.removeCaptain);

onMounted(loadTeams);

const form = ref({ name: '', countryCode: '', logoUrl: '', group: '' });
const captainInputs = ref<Record<string, string>>({});

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
  const userId = captainInputs.value[teamId];
  if (!userId) return;
  await assign(teamId, userId);
  captainInputs.value[teamId] = '';
  await loadTeams();
}

async function removeCaptainFor(teamId: string) {
  await unassign(teamId);
  await loadTeams();
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
    <div v-else-if="error" class="alert alert-error">{{ error.message }}</div>
    <div v-else class="space-y-2">
      <div v-for="team in teams" :key="team.id" class="card bg-base-100 shadow-sm">
        <div class="card-body py-3 px-4">
          <div class="flex items-center justify-between flex-wrap gap-2">
            <div class="flex items-center gap-2">
              <img v-if="team.logoUrl || team.countryCode" :src="team.logoUrl ?? `https://flagcdn.com/${team.countryCode}.svg`" class="w-6 h-6 object-contain" />
              <span class="font-medium">{{ team.name }}</span>
              <span v-if="team.group" class="badge badge-ghost badge-sm">Grupo {{ team.group }}</span>
              <span v-if="team.eaClubId" class="badge badge-success badge-sm">EA: {{ team.eaClubId }}</span>
              <span v-else class="badge badge-ghost badge-sm">Sin eaClubId</span>
            </div>
            <div class="flex items-center gap-2">
              <input v-model="captainInputs[team.id]" placeholder="userId capitán" class="input input-bordered input-xs w-32" />
              <button class="btn btn-xs btn-primary" @click="submitCaptain(team.id)">Asignar</button>
              <button class="btn btn-xs btn-ghost" @click="removeCaptainFor(team.id)">Quitar</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
