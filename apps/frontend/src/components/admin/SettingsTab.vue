<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '@/lib/api';
import { translateApiError } from '@/i18n/translations';
import Loader from '@/components/layout/Loader.vue';

const settings = ref<{ captainsCanChangeEaClubId: boolean; eaClubIdChangeCooldownHours: number, captainsCanSetMatches: boolean } | null>(null);
const saving = ref(false);
const error = ref('');

onMounted(async () => {
  settings.value = await api.settings.get();
});

async function toggleAllowed() {
  if (!settings.value) return;
  saving.value = true;
  error.value = '';
  try {
    settings.value = await api.settings.admin.update({ captainsCanChangeEaClubId: !settings.value.captainsCanChangeEaClubId });
  } catch (e) {
    error.value = translateApiError(e);
  } finally {
    saving.value = false;
  }
}

async function saveCooldown() {
  if (!settings.value) return;
  saving.value = true;
  error.value = '';
  try {
    settings.value = await api.settings.admin.update({ eaClubIdChangeCooldownHours: settings.value.eaClubIdChangeCooldownHours });
  } catch (e) {
    error.value = translateApiError(e);
  } finally {
    saving.value = false;
  }
}

async function toggleCaptainsCanSetMatches() {
  if (!settings.value) return;
  saving.value = true;
  error.value = '';
  try {
    settings.value = await api.settings.admin.update({ captainsCanSetMatches: !settings.value.captainsCanSetMatches });
  } catch (e) {
    error.value = translateApiError(e);
  } finally {
    saving.value = false;
  }
}

</script>

<template>
  <div v-if="!settings" class="flex justify-center py-10">
    <Loader />
  </div>
  <div v-else class="max-w-md space-y-6">
    <div class="flex items-center justify-between bg-base-200 rounded-lg p-4">
      <div>
        <p class="font-bold">Capitanes pueden cambiar su EA Club ID</p>
        <p class="text-xs opacity-60">Si lo desactivas, solo tú puedes tocarlo desde "Equipos".</p>
      </div>
      <input type="checkbox" class="toggle toggle-primary" :checked="settings.captainsCanChangeEaClubId" :disabled="saving" @change="toggleAllowed" />
    </div>

    <div class="bg-base-200 rounded-lg p-4">
      <p class="font-bold mb-1">Cooldown entre cambios (horas)</p>
      <p class="text-xs opacity-60 mb-3">Tiempo mínimo entre dos cambios de EA Club ID del mismo equipo.</p>
      <div class="flex gap-2">
        <input v-model.number="settings.eaClubIdChangeCooldownHours" type="number" min="0" class="input input-bordered input-sm w-24" />
        <button class="btn btn-sm btn-primary" :disabled="saving" @click="saveCooldown">Guardar</button>
      </div>
    </div>

    <div class="flex items-center justify-between bg-base-200 rounded-lg p-4">
      <div>
        <p class="font-bold">Capitanes pueden establecer resultados de los partidos</p>
        <p class="text-xs opacity-60">Si lo desactivas, NO se podrán reportar partidos. Pensado para que nadie pueda trollear en dias/horas fuera de horario</p>
      </div>
      <input type="checkbox" class="toggle toggle-primary" :checked="settings.captainsCanSetMatches" :disabled="saving" @change="toggleCaptainsCanSetMatches" />
    </div>

    <p v-if="error" class="text-error text-sm">{{ error }}</p>
  </div>
</template>
