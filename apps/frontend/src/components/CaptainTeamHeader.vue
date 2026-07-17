<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import type { ITeam } from '@trueno-proclub-tourney/shared';
import { api, teamBadge } from '@/lib/api';
import { useAuth } from '@/composables/useAuth';

const { isLoggedIn, isPending, user } = useAuth();

const myTeam = ref<ITeam | null>(null);
const loading = ref(true);

const eaClubIdInput = ref('');
const savingEaClubId = ref(false);
const eaClubIdError = ref('');

async function loadMyTeam() {
  try {
    myTeam.value = await api.getMyTeam();
  } catch {
    myTeam.value = null;
  } finally {
    loading.value = false;
  }
}

watch(
  isPending,
  (pending) => {
    if (pending) return;
    if (!isLoggedIn.value) { loading.value = false; return; }
    loadMyTeam();
  },
  { immediate: true }
);

async function saveEaClubId() {
  if (!myTeam.value || !eaClubIdInput.value.trim()) return;
  savingEaClubId.value = true;
  eaClubIdError.value = '';
  try {
    myTeam.value = await api.setEaClubId(myTeam.value.id, eaClubIdInput.value.trim());
    eaClubIdInput.value = '';
    const modal = document.getElementById('ea_modal') as HTMLDialogElement;
    if (modal) modal.close();
  } catch (e) {
    eaClubIdError.value = e instanceof Error ? e.message : 'Error guardando';
  } finally {
    savingEaClubId.value = false;
  }
}
</script>

<template>
  <div v-if="isLoggedIn && myTeam" class="bg-base-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm border border-base-300 mb-6">
    <div class="flex items-center gap-4">
      <div class="avatar">
        <div class="w-12 h-12 rounded bg-base-100 flex items-center justify-center text-xl shadow-sm">
          <span v-if="!teamBadge(myTeam)">{{ myTeam.name.charAt(0) }}</span>
          <img v-else :src="teamBadge(myTeam)!" class="object-contain" />
        </div>
      </div>
      <div>
        <h2 class="text-xl font-bold">{{ myTeam.name }}</h2>
        <p class="text-xs opacity-60">Capitán: {{ user?.name }}</p>
      </div>
    </div>

    <!-- Configuración de EA Club ID -->
    <div class="flex items-center gap-2">
      <div v-if="myTeam.eaClubId" class="text-right">
        <div class="text-xs opacity-60 mb-1">Club EA configurado</div>
        <div class="font-bold text-sm">{{ myTeam.eaClubName ?? '(nombre no disponible)' }}</div>
        <div class="font-mono text-xs opacity-60 bg-base-300 px-2 py-0.5 rounded inline-block mt-0.5">ID {{ myTeam.eaClubId }}</div>
      </div>
      <div v-else class="text-right text-warning">
        <div class="text-xs font-bold mb-1">¡Falta EA Club ID!</div>
        <div class="text-xs">No podrás reportar partidos</div>
      </div>
      <button class="btn btn-sm btn-outline ml-2" onclick="document.getElementById('ea_modal').showModal()">
        Cambiar ID
      </button>
    </div>

    <!-- Modal: Cambiar EA ID -->
    <dialog id="ea_modal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg">Configurar EA Club ID</h3>
        <p class="py-4 text-sm opacity-80">Introduce el ID numérico de tu club en EA FC. Es necesario para que el sistema busque los partidos automáticamente.</p>
        <input v-model="eaClubIdInput" placeholder="Ej: 1234567" class="input input-bordered w-full mb-2" />
        <p v-if="eaClubIdError" class="text-error text-xs mb-2">{{ eaClubIdError }}</p>
        <div class="modal-action">
          <form method="dialog">
            <button class="btn btn-ghost mr-2">Cancelar</button>
            <button class="btn btn-primary" :disabled="savingEaClubId" @click.prevent="saveEaClubId()">
              {{ savingEaClubId ? 'Guardando...' : 'Guardar' }}
            </button>
          </form>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>
  </div>
</template>
