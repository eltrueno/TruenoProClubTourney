<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import type { ISeries, IEaCandidateMatch } from '@trueno-proclub-tourney/shared';
import { api, ApiError } from '../lib/api';
import { useAuth } from '@/composables/useAuth';

const { isLoggedIn, isPending, user, loginWithTwitchPopup } = useAuth();
const series = ref<ISeries[]>([]);
const loading = ref(true);
const globalError = ref<string | null>(null);

// Estados por slot
const confirming = ref<Record<string, boolean>>({});
const slotError = ref<Record<string, string>>({});

// Modal "Añadir partido de EA"
const addingSlot = ref<{ seriesId: string; position: number } | null>(null);
const candidates = ref<IEaCandidateMatch[]>([]);
const candidatesLoading = ref(false);

// Modal "Algo no cuadra"
const editingSlot = ref<{ seriesId: string; position: number; scoreA: number; scoreB: number; penA: number | null; penB: number | null } | null>(null);
const editDescription = ref('');

const myTeam = ref<import('@trueno-proclub-tourney/shared').ITeam | null>(null);
const eaClubIdInput = ref('');
const savingEaClubId = ref(false);
const eaClubIdError = ref('');

async function saveEaClubId() {
  if (!myTeam.value || !eaClubIdInput.value.trim()) return;
  savingEaClubId.value = true;
  eaClubIdError.value = '';
  try {
    myTeam.value = await api.setEaClubId(myTeam.value.id, eaClubIdInput.value.trim());
  } catch (e) {
    eaClubIdError.value = e instanceof Error ? e.message : 'Error guardando';
  } finally {
    savingEaClubId.value = false;
  }
}

async function loadMySeries() {
  try {
    const [s, t] = await Promise.all([api.getMySeries(), api.getMyTeam()]);
    series.value = s;
    myTeam.value = t;
  } catch (e) {
    globalError.value = e instanceof Error ? e.message : 'Error cargando tus partidos';
  } finally {
    loading.value = false;
  }
}

watch(
  isPending,
  (pending) => {
    if (pending) return;
    if (!isLoggedIn.value) { loading.value = false; return; }
    loadMySeries();
  },
  { immediate: true }
);

function slotKey(seriesId: string, position: number) { return `${seriesId}-${position}`; }

async function openAddModal(seriesId: string, position: number, eaClubId: string) {
  addingSlot.value = { seriesId, position };
  candidatesLoading.value = true;
  candidates.value = [];
  try {
    candidates.value = await api.getEaCandidates(eaClubId);
  } catch (e) {
    slotError.value[slotKey(seriesId, position)] = e instanceof Error ? e.message : 'Error';
    addingSlot.value = null;
  } finally {
    candidatesLoading.value = false;
  }
}

async function selectCandidate(candidate: IEaCandidateMatch) {
  if (!addingSlot.value) return;
  const { seriesId, position } = addingSlot.value;
  const key = slotKey(seriesId, position);
  slotError.value[key] = '';
  try {
    const updated = await api.selectCandidate(seriesId, position, candidate);
    series.value = series.value.map((s) => s.id === seriesId ? updated : s);
    addingSlot.value = null;
  } catch (e) {
    slotError.value[key] = e instanceof Error ? e.message : 'Error';
  }
}

async function confirm(seriesId: string, position: number) {
  const key = slotKey(seriesId, position);
  confirming.value[key] = true;
  slotError.value[key] = '';
  try {
    const updated = await api.confirmMatch(seriesId, position);
    series.value = series.value.map((s) => s.id === seriesId ? updated : s);
  } catch (e) {
    slotError.value[key] = e instanceof ApiError ? e.message : 'Error confirmando';
  } finally {
    confirming.value[key] = false;
  }
}

function openEditModal(seriesId: string, position: number, match: any) {
  editingSlot.value = {
    seriesId, position,
    scoreA: match.effective.teamA?.score ?? 0,
    scoreB: match.effective.teamB?.score ?? 0,
    penA: match.effective.teamA?.penaltiesScore ?? null,
    penB: match.effective.teamB?.penaltiesScore ?? null,
  };
  editDescription.value = '';
}

async function submitEdit() {
  if (!editingSlot.value || !editDescription.value.trim()) return;
  const { seriesId, position, scoreA, scoreB, penA, penB } = editingSlot.value;
  const key = slotKey(seriesId, position);
  slotError.value[key] = '';
  try {
    const updated = await api.editMatch(seriesId, position, {
      teamA: { score: scoreA, penaltiesScore: penA, stats: { goals: 0, shots: 0, passesMade: 0, passesSuccess: 0, tacklesMade: 0, tacklesSuccess: 0, redCards: 0 }, players: [] },
      teamB: { score: scoreB, penaltiesScore: penB, stats: { goals: 0, shots: 0, passesMade: 0, passesSuccess: 0, tacklesMade: 0, tacklesSuccess: 0, redCards: 0 }, players: [] },
      changeDescription: editDescription.value,
    });
    series.value = series.value.map((s) => s.id === seriesId ? updated : s);
    editingSlot.value = null;
  } catch (e) {
    slotError.value[key] = e instanceof Error ? e.message : 'Error';
  }
}

const statusLabel: Record<string, string> = {
  unselected: 'Sin seleccionar',
  pending_confirmation: 'Pendiente',
  confirmed: 'Confirmado',
  disputed: 'En disputa',
};
const statusBadge: Record<string, string> = {
  unselected: 'badge-ghost',
  pending_confirmation: 'badge-warning',
  confirmed: 'badge-success',
  disputed: 'badge-error',
};

function formatMatchScore(teamData: any) {
  if (!teamData || teamData.score == null) return '?';
  let r = teamData.score.toString();
  if (teamData.penaltiesScore != null) r += ` (${teamData.penaltiesScore})`;
  return r;
}
</script>

<template>
  <div>
    <!-- Sin sesión -->
    <div v-if="!loading && !isLoggedIn" class="hero py-20">
      <div class="hero-content text-center">
        <div>
          <h2 class="text-2xl font-bold mb-2">Acceso restringido</h2>
          <p class="opacity-60 mb-6">Inicia sesión con Twitch para acceder al panel de capitán.</p>
          <button class="btn btn-primary" @click="loginWithTwitchPopup()">Iniciar sesión con Twitch</button>
        </div>
      </div>
    </div>

    <!-- Cargando -->
    <div v-else-if="loading" class="flex justify-center py-16">
      <span class="loading loading-spinner loading-lg text-primary"></span>
    </div>

    <!-- Error global -->
    <div v-else-if="globalError" class="alert alert-error">{{ globalError }}</div>

    <!-- Sin partidos -->
    <div v-else-if="series.length === 0" class="text-center py-12 opacity-50">
      No tienes partidos pendientes ahora mismo.
    </div>

    <!-- Panel -->
    <div v-else class="space-y-6">
      <!-- Aviso: falta configurar el eaClubId -->
      <div v-if="myTeam && !myTeam.eaClubId" class="alert alert-warning">
        <div class="flex-1">
          <p class="font-medium">Configura el ID de club de EA de {{ myTeam.name }} antes de reportar</p>
          <div class="flex gap-2 mt-2">
            <input v-model="eaClubIdInput" placeholder="ID de club en EA" class="input input-bordered input-sm" />
            <button class="btn btn-sm btn-primary" :disabled="savingEaClubId" @click="saveEaClubId">
              {{ savingEaClubId ? 'Guardando...' : 'Guardar' }}
            </button>
          </div>
          <p v-if="eaClubIdError" class="text-error text-xs mt-1">{{ eaClubIdError }}</p>
        </div>
      </div>

      <div v-for="s in series" :key="s.id" class="card bg-base-100 shadow">
        <div class="card-body">
          <!-- Cabecera de la serie -->
          <div class="flex items-center justify-between mb-2">
            <h3 class="font-bold text-lg">{{ s.round }}</h3>
            <span class="text-sm opacity-50">{{ s.stageType === 'groups' ? `Grupo ${s.group}` : s.stageType }}</span>
          </div>

          <!-- Matches -->
          <div class="divide-y">
            <div v-for="match in s.matches" :key="match.position" class="py-3">
              <div class="flex items-start justify-between gap-4">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-sm font-medium">Partida {{ match.position }}</span>
                    <span class="badge badge-xs" :class="statusBadge[match.status]">{{ statusLabel[match.status] }}</span>
                  </div>

                  <!-- Marcador actual -->
                  <div v-if="match.effective.teamA?.score != null" class="text-2xl font-bold tabular-nums">
                    {{ formatMatchScore(match.effective.teamA) }} – {{ formatMatchScore(match.effective.teamB) }}
                  </div>
                  <div v-else-if="match.status === 'unselected'" class="text-sm opacity-40">
                    Sin partido asignado
                  </div>

                  <!-- Error del slot -->
                  <p v-if="slotError[slotKey(s.id, match.position)]" class="text-error text-xs mt-1">
                    {{ slotError[slotKey(s.id, match.position)] }}
                  </p>

                  <!-- Confirmaciones -->
                  <div v-if="match.status === 'pending_confirmation'" class="text-xs opacity-50 mt-1">
                    <span v-if="match.confirmations.byTeamA && match.confirmations.byTeamB">Ambos confirmaron</span>
                    <span v-else-if="match.confirmations.byTeamA">Tu equipo confirmó — esperando al rival</span>
                    <span v-else-if="match.confirmations.byTeamB">El rival confirmó — falta tu confirmación</span>
                  </div>

                  <!-- Disputa -->
                  <div v-if="match.status === 'disputed'" class="alert alert-error py-2 text-sm mt-2">
                    Los dos capitanes reportaron marcadores distintos. Un administrador lo revisará.
                  </div>
                </div>

                <!-- Acciones -->
                <div class="flex flex-col gap-2 shrink-0">
                  <!-- Sin seleccionar: botón añadir -->
                  <button
                    v-if="match.status === 'unselected' && myTeam?.eaClubId"
                    class="btn btn-sm btn-primary"
                    @click="openAddModal(s.id, match.position, myTeam.eaClubId)"
                  >
                    Añadir partido
                  </button>
                  <div v-else-if="match.status === 'unselected'" class="text-xs text-warning max-w-40 text-right">
                    Configura el eaClubId de tu equipo antes de reportar
                  </div>

                  <!-- Pendiente: confirmar o editar -->
                  <template v-else-if="match.status === 'pending_confirmation'">
                    <button
                      class="btn btn-sm btn-success"
                      :class="{ 'loading loading-spinner': confirming[slotKey(s.id, match.position)] }"
                      :disabled="!!confirming[slotKey(s.id, match.position)] || !!match.confirmations.byTeamA"
                      @click="confirm(s.id, match.position)"
                    >
                      {{ match.confirmations.byTeamA ? 'Ya confirmado' : 'Todo correcto' }}
                    </button>
                    <button
                      class="btn btn-sm btn-outline btn-warning"
                      @click="openEditModal(s.id, match.position, match)"
                    >
                      Algo no cuadra
                    </button>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: elegir partido de EA -->
    <dialog v-if="addingSlot" class="modal modal-open">
      <div class="modal-box max-w-lg">
        <h3 class="font-bold text-lg mb-4">Selecciona el partido</h3>
        <div v-if="candidatesLoading" class="flex justify-center py-8">
          <span class="loading loading-spinner loading-md"></span>
        </div>
        <div v-else-if="candidates.length === 0" class="opacity-50 text-sm text-center py-4">
          No se encontraron partidos recientes en EA.
        </div>
        <div v-else class="space-y-2 max-h-72 overflow-y-auto">
          <button
            v-for="c in candidates"
            :key="c.eaMatchId"
            class="btn btn-outline btn-sm w-full justify-between"
            @click="selectCandidate(c)"
          >
            <span class="tabular-nums">{{ formatMatchScore(c.teamA) }} – {{ formatMatchScore(c.teamB) }}</span>
            <span class="text-xs opacity-60">{{ new Date(c.playedAt).toLocaleDateString('es') }}</span>
          </button>
        </div>
        <div class="modal-action">
          <button class="btn btn-ghost btn-sm" @click="addingSlot = null">Cancelar</button>
        </div>
      </div>
      <div class="modal-backdrop" @click="addingSlot = null"></div>
    </dialog>

    <!-- Modal: editar marcador -->
    <dialog v-if="editingSlot" class="modal modal-open">
      <div class="modal-box max-w-sm">
        <h3 class="font-bold text-lg mb-4">Corregir resultado</h3>
        <div class="flex items-center gap-4 justify-center mb-4">
          <input v-model.number="editingSlot.scoreA" type="number" min="0" class="input input-bordered w-20 text-center text-xl font-bold" />
          <span class="text-2xl font-bold">–</span>
          <input v-model.number="editingSlot.scoreB" type="number" min="0" class="input input-bordered w-20 text-center text-xl font-bold" />
        </div>
        <label class="label"><span class="label-text">Motivo de la corrección *</span></label>
        <textarea
          v-model="editDescription"
          class="textarea textarea-bordered w-full"
          placeholder="Ej: gol en contra por sanción, desconexión..."
          rows="2"
        ></textarea>
        <div class="modal-action">
          <button class="btn btn-ghost btn-sm" @click="editingSlot = null">Cancelar</button>
          <button class="btn btn-warning btn-sm" :disabled="!editDescription.trim()" @click="submitEdit">Guardar</button>
        </div>
      </div>
      <div class="modal-backdrop" @click="editingSlot = null"></div>
    </dialog>
  </div>
</template>
