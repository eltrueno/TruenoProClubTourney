<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import type { ISeries, ITeam, StageType } from '@trueno-proclub-tourney/shared';
import { api } from '@/lib/api';
import GroupsStage from './GroupsStage.vue';
import KnockoutStage from './KnockoutStage.vue';
import Loader from '@/components/layout/Loader.vue';

type StageView = {
  id: string;
  name: string;
  type: StageType;
};

const series = ref<ISeries[]>([]);
const teams = ref<Record<string, ITeam>>({});
const loading = ref(true);
const error = ref<string | null>(null);
const activeStageId = ref<string | null>(null);

onMounted(async () => {
  try {
    const [s, t] = await Promise.all([
      api.series.getAll(),
      api.teams.getAll(),
    ]);

    series.value = s;
    teams.value = Object.fromEntries(
      t.map((team) => [team.id, team])
    );

    // Mostrar por defecto la última fase disponible
    const stageIds = [...new Set(s.map((x) => x.stageId))];
    activeStageId.value = stageIds.at(-1) ?? null;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error cargando el torneo';
  } finally {
    loading.value = false;
  }
});

const stages = computed<StageView[]>(() => {
  const map = new Map<string, StageView>();

  for (const s of series.value) {
    if (!map.has(s.stageId)) {
      map.set(s.stageId, {
        id: s.stageId,
        name: s.stageId,
        type: s.stageType,
      });
    }
  }

  return [...map.values()];
});

const activeStage = computed<StageView | null>(() => {
  if (!activeStageId.value) return null;
  return stages.value.find((s) => s.id === activeStageId.value) ?? null;
});

const groupsStage = computed(() =>
  activeStage.value?.type === 'groups'
    ? activeStage.value
    : null
);

const knockoutStage = computed(() =>
  activeStage.value?.type === 'knockout'
    ? activeStage.value
    : null
);

</script>

<template>
  <div v-if="loading" class="flex justify-center py-16">
    <Loader />
  </div>
  <div v-else-if="error" class="alert alert-error">{{ error }}</div>

  <div v-else-if="stages" class="space-y-6">
    <!-- Selector de fase -->
    <div v-if="stages.length > 1" role="tablist" class="tabs tabs-lift">
      <a
        v-for="stage in stages"
        :key="stage.id"
        role="tab"
        class="tab"
        :class="{ 'tab-active font-bold': activeStageId === stage.id }"
        @click="activeStageId = stage.id"
      >
        {{ stage.name }}
      </a>
    </div>
    <h2 v-else class="text-lg font-bold">{{stages[0]?.name }}</h2>

    <GroupsStage
      v-if="activeStage?.type === 'groups'"
      :stage-id="activeStage.id"
      :stage-name="activeStage.name"
      :series="series"
      :teams="teams"
      :qualify-count="2"
    />

    <KnockoutStage
      v-else-if="activeStage?.type === 'knockout'"
      :key="`knockout-${activeStage.id}`"
      :stage-id="activeStage.id"
      :stage-name="activeStage.name"
      :series="series"
      :teams="teams"
    />
    <div v-else-if="activeStage" class="alert">
      La fase "{{ activeStage.name }}" es de tipo {{ activeStage.type }}, todavía sin vista dedicada.
    </div>
  </div>
</template>
