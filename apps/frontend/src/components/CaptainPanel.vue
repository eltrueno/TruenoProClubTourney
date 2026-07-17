<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import type { ISeries, IEaCandidateMatch, ITeam } from '@trueno-proclub-tourney/shared';
import { api, teamBadge, ApiError } from '@/lib/api';
import { useAuth } from '@/composables/useAuth';

const { isLoggedIn, isPending, user, loginWithTwitchPopup } = useAuth();
const series = ref<import('@trueno-proclub-tourney/shared').IMySeriesResponse[]>([]);
const loading = ref(true);
const globalError = ref<string | null>(null);

const myTeam = ref<ITeam | null>(null);

// Estados por slot
const confirming = ref<Record<string, boolean>>({});
const unselecting = ref<Record<string, boolean>>({});
const slotError = ref<Record<string, string>>({});

// Modal "Añadir partido de EA"
const addingSlot = ref<{ seriesId: string; position: number } | null>(null);
const candidates = ref<IEaCandidateMatch[]>([]);
const candidatesLoading = ref(false);
const candidatesLoadError = ref('');

// Modo manual dentro del modal de añadir partido
const manualMode = ref(false);
const manualAck = ref(false);
const manualForm = ref({ scoreA: 0, scoreB: 0, penA: null as number | null, penB: null as number | null });
const manualSaving = ref(false);
const manualError = ref('');

// Modal "Algo no cuadra"
const editingSlot = ref<{ seriesId: string; position: number; scoreA: number; scoreB: number; penA: number | null; penB: number | null } | null>(null);
const editDescription = ref('');

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

function updateSeries(seriesId: string, updated: ISeries) {
  series.value = series.value.map((s) => s.id === seriesId ? (updated as import('@trueno-proclub-tourney/shared').IMySeriesResponse) : s);
}

async function openAddModal(seriesId: string, position: number, eaClubId: string) {
  addingSlot.value = { seriesId, position };
  candidatesLoading.value = true;
  candidatesLoadError.value = '';
  candidates.value = [];
  manualMode.value = false;
  manualAck.value = false;
  manualForm.value = { scoreA: 0, scoreB: 0, penA: null, penB: null };
  manualError.value = '';
  try {
    candidates.value = await api.getEaCandidates(eaClubId);
  } catch (e) {
    candidatesLoadError.value = e instanceof Error ? e.message : 'Error buscando partidos en EA';
  } finally {
    candidatesLoading.value = false;
  }
}

function closeAddModal() {
  addingSlot.value = null;
  manualMode.value = false;
}

async function selectCandidate(candidate: IEaCandidateMatch) {
  if (!addingSlot.value) return;
  const { seriesId, position } = addingSlot.value;
  const key = slotKey(seriesId, position);
  slotError.value[key] = '';
  try {
    const updated = await api.selectCandidate(seriesId, position, candidate);
    updateSeries(seriesId, updated);
    closeAddModal();
  } catch (e) {
    slotError.value[key] = e instanceof Error ? e.message : 'Error';
  }
}

async function submitManualMatch() {
  if (!addingSlot.value || !manualAck.value) return;
  const { seriesId, position } = addingSlot.value;
  const key = slotKey(seriesId, position);
  manualSaving.value = true;
  manualError.value = '';
  try {
    const updated = await api.createManualMatch(seriesId, position, {
      teamA: { score: manualForm.value.scoreA, penaltiesScore: manualForm.value.penA },
      teamB: { score: manualForm.value.scoreB, penaltiesScore: manualForm.value.penB },
    });
    updateSeries(seriesId, updated);
    closeAddModal();
  } catch (e) {
    manualError.value = e instanceof Error ? e.message : 'Error guardando el partido manual';
  } finally {
    manualSaving.value = false;
  }
}

async function confirm(seriesId: string, position: number) {
  const key = slotKey(seriesId, position);
  confirming.value[key] = true;
  slotError.value[key] = '';
  try {
    const updated = await api.confirmMatch(seriesId, position);
    updateSeries(seriesId, updated);
  } catch (e) {
    slotError.value[key] = e instanceof ApiError ? e.message : 'Error confirmando';
  } finally {
    confirming.value[key] = false;
  }
}

async function unselectMatch(seriesId: string, position: number) {
  const key = slotKey(seriesId, position);
  if (!window.confirm('¿Seguro que quieres quitar este partido? Se perderán las confirmaciones y podrás seleccionar otro distinto.')) {
    return;
  }
  unselecting.value[key] = true;
  slotError.value[key] = '';
  try {
    const updated = await api.unselectMatch(seriesId, position);
    updateSeries(seriesId, updated);
  } catch (e) {
    slotError.value[key] = e instanceof ApiError ? e.message : 'Error quitando el partido';
  } finally {
    unselecting.value[key] = false;
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
    updateSeries(seriesId, updated);
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
      <div v-for="s in series" :key="s.id" class="card bg-base-100 shadow">
        <div class="card-body">
          <!-- Cabecera de la serie -->
          <div class="flex flex-wrap items-center justify-between mb-4 gap-2">
            <div class="flex flex-wrap items-center gap-3">
              <div class="font-bold text-lg flex items-center gap-2">
                <img v-if="teamBadge(s.teamA as any)" :src="teamBadge(s.teamA as any)!" class="w-6 h-6 object-contain" />
                <span :class="s.mySide === 'A' ? 'text-primary' : ''">{{ (s.teamA as any)?.name ?? 'TBD' }}</span>
                <span v-if="s.mySide === 'A'" class="badge badge-primary badge-xs">Tú</span>
                <span class="opacity-30 text-sm font-normal">vs</span>
                <span :class="s.mySide === 'B' ? 'text-primary' : ''">{{ (s.teamB as any)?.name ?? 'TBD' }}</span>
                <span v-if="s.mySide === 'B'" class="badge badge-primary badge-xs">Tú</span>
                <img v-if="teamBadge(s.teamB as any)" :src="teamBadge(s.teamB as any)!" class="w-6 h-6 object-contain" />
              </div>
              <span class="badge badge-sm badge-ghost">{{ s.round }}</span>
              <span class="badge badge-sm badge-ghost">Bo{{ s.bestOf }}</span>
            </div>
            <span class="text-sm opacity-50">{{ s.stageType === 'groups' ? `Grupo ${s.group}` : s.stageType }}</span>
          </div>

          <!-- Matches -->
          <div class="divide-y border-t">
            <div v-for="match in s.matches" :key="match.position" class="py-3">
              <div class="flex items-start justify-between gap-4">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-sm font-medium">{{ s.bestOf > 1 ? `Partida ${match.position}` : 'Resultado' }}</span>
                    <span class="badge badge-xs" :class="statusBadge[match.status]">{{ statusLabel[match.status] }}</span>
                    <span v-if="match.isManual" class="badge badge-xs badge-outline">Manual</span>
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
                <div class="flex flex-col gap-2 shrink-0 items-end">
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

                  <!-- Pendiente: confirmar, editar o quitar -->
                  <template v-else-if="match.status === 'pending_confirmation'">
                    <div class="flex gap-2">
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
                    </div>
                    <button
                      class="btn btn-xs btn-ghost text-error"
                      :class="{ 'loading loading-spinner': unselecting[slotKey(s.id, match.position)] }"
                      :disabled="!!unselecting[slotKey(s.id, match.position)]"
                      @click="unselectMatch(s.id, match.position)"
                    >
                      Quitar partido
                    </button>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: elegir partido de EA / manual -->
    <dialog v-if="addingSlot" class="modal modal-open">
      <div class="modal-box max-w-lg">
        <h3 class="font-bold text-lg mb-4">{{ manualMode ? 'Añadir partido a mano' : 'Selecciona el partido' }}</h3>

        <!-- Vista de candidatos de EA -->
        <template v-if="!manualMode">
          <div v-if="candidatesLoading" class="flex justify-center py-8">
            <span class="loading loading-spinner loading-md"></span>
          </div>
          <div v-else-if="candidatesLoadError" class="alert alert-error text-sm">{{ candidatesLoadError }}</div>
          <template v-else>
            <div v-if="candidates.length === 0" class="opacity-50 text-sm text-center py-4">
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
                      <div class="text-xs font-normal opacity-60 mb-0.5">Tu equipo</div>
                      <div class="text-sm font-bold text-primary">{{ c.teamA.eaClubName ?? `Club ${c.teamA.eaClubId ?? '?'}` }}</div>
                    </div>
                    <div class="px-3 whitespace-nowrap">{{ formatMatchScore(c.teamA) }} – {{ formatMatchScore(c.teamB) }}</div>
                    <div class="flex-1 text-left">
                      <div class="text-xs font-normal opacity-60 mb-0.5">Rival</div>
                      <div class="text-sm font-normal">{{ c.teamB.eaClubName ?? `Club ${c.teamB.eaClubId ?? '?'}` }}</div>
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
          </template>

          <div class="divider text-xs opacity-50 my-4">o si no aparece</div>
          <button class="btn btn-sm btn-outline btn-warning w-full" @click="manualMode = true">
            No está el partido, añadirlo a mano
          </button>
        </template>

        <!-- Vista manual -->
        <template v-else>
          <div class="alert alert-warning text-sm mb-3 flex-col items-start gap-1">
            <p class="font-bold">Antes de continuar:</p>
            <ul class="list-disc list-inside space-y-0.5">
              <li>EA tarda unos minutos en publicar el partido. Espera y vuelve a intentar buscarlo antes de meterlo a mano.</li>
              <li>Recarga esta página y repite la búsqueda: puede que ya haya aparecido.</li>
              <li>Un resultado manual no tiene ninguna prueba automática asociada — si hay disputa, un admin podrá pedir capturas de pantalla.</li>
              <li>El rival tendrá que confirmar igualmente este marcador.</li>
            </ul>
          </div>

          <div class="flex items-center gap-4 justify-center mb-2">
            <div class="text-center">
              <div class="text-xs opacity-60 mb-1">Tu equipo</div>
              <input v-model.number="manualForm.scoreA" type="number" min="0" class="input input-bordered w-20 text-center text-xl font-bold" />
            </div>
            <span class="text-2xl font-bold mt-5">–</span>
            <div class="text-center">
              <div class="text-xs opacity-60 mb-1">Rival</div>
              <input v-model.number="manualForm.scoreB" type="number" min="0" class="input input-bordered w-20 text-center text-xl font-bold" />
            </div>
          </div>

          <label class="label cursor-pointer justify-start gap-2 mt-2">
            <input type="checkbox" v-model="manualAck" class="checkbox checkbox-sm checkbox-warning" />
            <span class="label-text text-sm">He esperado, he recargado y el partido sigue sin aparecer. Entiendo que este resultado no tiene prueba automática.</span>
          </label>

          <p v-if="manualError" class="text-error text-xs mt-2">{{ manualError }}</p>

          <div class="modal-action">
            <button class="btn btn-ghost btn-sm" @click="manualMode = false">Volver a buscar en EA</button>
            <button class="btn btn-warning btn-sm" :disabled="!manualAck || manualSaving" @click="submitManualMatch">
              {{ manualSaving ? 'Guardando...' : 'Guardar resultado manual' }}
            </button>
          </div>
        </template>

        <div v-if="!manualMode" class="modal-action">
          <button class="btn btn-ghost btn-sm" @click="closeAddModal">Cancelar</button>
        </div>
      </div>
      <div class="modal-backdrop" @click="closeAddModal"></div>
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
