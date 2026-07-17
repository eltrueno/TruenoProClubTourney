<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import type { ISeries, IEaCandidateMatch } from '@trueno-proclub-tourney/shared';
import { api, teamBadge, ApiError } from '@/lib/api';
import { useAuth } from '@/composables/useAuth';

const { isLoggedIn, isPending, user, loginWithTwitchPopup } = useAuth();
const series = ref<import('@trueno-proclub-tourney/shared').IMySeriesResponse[]>([]);
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
    const modal = document.getElementById('ea_modal') as HTMLDialogElement;
    if (modal) modal.close();
  } catch (e) {
    eaClubIdError.value = e instanceof Error ? e.message : 'Error guardando';
  } finally {
    savingEaClubId.value = false;
  }
}

async function loadMySeries() {
  try {
    const [s, t] = await Promise.all([api.getMySeries(), api.getMyTeam()]);
    series.value = s as import('@trueno-proclub-tourney/shared').IMySeriesResponse[];
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
    series.value = series.value.map((s) => s.id === seriesId ? (updated as import('@trueno-proclub-tourney/shared').IMySeriesResponse) : s);
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
    series.value = series.value.map((s) => s.id === seriesId ? (updated as import('@trueno-proclub-tourney/shared').IMySeriesResponse) : s);
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
      teamA: { score: scoreA, penaltiesScore: penA },
      teamB: { score: scoreB, penaltiesScore: penB },
      changeDescription: editDescription.value,
    });
    series.value = series.value.map((s) => s.id === seriesId ? (updated as import('@trueno-proclub-tourney/shared').IMySeriesResponse) : s);
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

    <!-- Panel -->
    <div v-else class="space-y-6">
      <!-- Cabecera de equipo: siempre visible, independiente de si hay partidos -->
      <div v-if="myTeam" class="bg-base-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm border border-base-300">
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
      </div>

      <!-- Sin partidos -->
      <div v-if="series.length === 0" class="text-center py-12 opacity-50">
        No tienes partidos pendientes ahora mismo.
      </div>

      <div v-for="s in series" :key="s.id" class="card bg-base-100 shadow">
        <div class="card-body">
          <!-- Cabecera de la serie -->
          <div class="flex flex-wrap items-center justify-between mb-4 gap-2">
            <div class="flex flex-wrap items-center gap-3">
              <div class="font-bold text-lg flex items-center gap-2">
                <span :class="s.mySide === 'A' ? 'text-primary' : ''">{{ (s.teamA as any)?.name ?? 'TBD' }}</span>
                <span class="opacity-30 text-sm font-normal">vs</span>
                <span :class="s.mySide === 'B' ? 'text-primary' : ''">{{ (s.teamB as any)?.name ?? 'TBD' }}</span>
              </div>
              <span class="badge badge-sm badge-ghost">{{ s.round }}</span>
            </div>
            <span class="text-sm opacity-50">{{ s.stageType === 'groups' ? `Grupo ${s.group}` : s.stageType }}</span>
          </div>

          <!-- Matches -->
          <div class="divide-y border-t">
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
                    <span v-if="match.confirmations?.byTeamA?.userId && match.confirmations?.byTeamB?.userId">Ambos confirmaron</span>
                    <span v-else-if="match.confirmations?.[s.mySide === 'A' ? 'byTeamA' : 'byTeamB']?.userId" class="text-success">Tu equipo confirmó — esperando al rival</span>
                    <span v-else-if="match.confirmations?.[s.mySide === 'A' ? 'byTeamB' : 'byTeamA']?.userId" class="text-warning">El rival confirmó — falta tu confirmación</span>
                    <span v-else>Esperando confirmación de ambos equipos</span>
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
                      :disabled="!!confirming[slotKey(s.id, match.position)] || !!match.confirmations?.[s.mySide === 'A' ? 'byTeamA' : 'byTeamB']?.userId"
                      @click="confirm(s.id, match.position)"
                    >
                      {{ match.confirmations?.[s.mySide === 'A' ? 'byTeamA' : 'byTeamB']?.userId ? 'Ya confirmado' : 'Todo correcto' }}
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
        <div v-else class="space-y-2 max-h-96 overflow-y-auto pr-2">
          <div
            v-for="c in candidates"
            :key="c.eaMatchId"
            class="card bg-base-200 shadow-sm cursor-pointer hover:bg-base-300 transition-colors"
            @click="selectCandidate(c)"
          >
            <div class="card-body p-3">
              <div class="flex items-center justify-between mb-1">
                <span class="text-xs opacity-60">{{ new Date(c.playedAt).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' }) }}</span>
                <span class="badge badge-xs" :class="(c.teamA.score ?? 0) > (c.teamB.score ?? 0) ? 'badge-success' : (c.teamA.score ?? 0) < (c.teamB.score ?? 0) ? 'badge-error' : 'badge-warning'">
                  {{ (c.teamA.score ?? 0) > (c.teamB.score ?? 0) ? 'Victoria' : (c.teamA.score ?? 0) < (c.teamB.score ?? 0) ? 'Derrota' : 'Empate' }}
                </span>
              </div>
              <div class="flex items-center justify-between font-bold text-lg tabular-nums">
                <div class="flex-1 text-right">
                  <div class="text-sm font-normal" :class="{ 'text-primary font-bold': myTeam?.eaClubId === c.teamA.eaClubId }">{{ c.teamA.eaClubName ?? `Club ${c.teamA.eaClubId ?? '?'}` }}</div>
                </div>
                <div class="px-3 whitespace-nowrap">{{ formatMatchScore(c.teamA) }} – {{ formatMatchScore(c.teamB) }}</div>
                <div class="flex-1 text-left">
                  <div class="text-sm font-normal" :class="{ 'text-primary font-bold': myTeam?.eaClubId === c.teamB.eaClubId }">{{ c.teamB.eaClubName ?? `Club ${c.teamB.eaClubId ?? '?'}` }}</div>
                </div>
              </div>
              
              <!-- Scorers -->
              <div class="mt-2 text-xs opacity-75 flex justify-between gap-4">
                <div class="flex-1 text-right">
                  <span v-for="p in c.teamA.players.filter(p => p.goals > 0)" :key="p.eaId" class="block">
                    ⚽ {{ p.name }} <span v-if="p.goals > 1">x{{ p.goals }}</span>
                  </span>
                </div>
                <div class="flex-1 text-left">
                  <span v-for="p in c.teamB.players.filter(p => p.goals > 0)" :key="p.eaId" class="block">
                    ⚽ {{ p.name }} <span v-if="p.goals > 1">x{{ p.goals }}</span>
                  </span>
                </div>
              </div>

              <!-- DNF / PEN -->
              <div v-if="c.winnerByDnf || c.winnerByPen" class="mt-2 flex gap-1 justify-center">
                <span v-if="c.winnerByDnf" class="badge badge-error badge-outline badge-xs">DNF</span>
                <span v-if="c.winnerByPen" class="badge badge-info badge-outline badge-xs">Penaltis</span>
              </div>
            </div>
          </div>
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
      <div class="modal-backdrop" @click="addingSlot = null"></div>
    </dialog>

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
