<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '@/lib/api';

const settings = ref<{ captainsCanChangeEaClubId: boolean; eaClubIdChangeCooldownHours: number } | null>(null);
const saving = ref(false);
const error = ref('');

onMounted(async () => {
  settings.value = await api.getSettings();
});

async function toggleAllowed() {
  if (!settings.value) return;
  saving.value = true;
  error.value = '';
  try {
    settings.value = await api.updateSettings({ captainsCanChangeEaClubId: !settings.value.captainsCanChangeEaClubId });
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error guardando';
  } finally {
    saving.value = false;
  }
}

async function saveCooldown() {
  if (!settings.value) return;
  saving.value = true;
  error.value = '';
  try {
    settings.value = await api.updateSettings({ eaClubIdChangeCooldownHours: settings.value.eaClubIdChangeCooldownHours });
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error guardando';
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div v-if="!settings" class="flex justify-center py-10">
    <span class="loading loading-spinner loading-md"></span>
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

    <p v-if="error" class="text-error text-sm">{{ error }}</p>
  </div>
</template>
