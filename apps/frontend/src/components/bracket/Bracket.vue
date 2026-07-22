<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import type { ISeries, ITeam, ITournamentConfig, IStageConfig } from '@trueno-proclub-tourney/shared';
import { api } from '@/lib/api';
import GroupsStage from './GroupsStage.vue';
import KnockoutStage from './KnockoutStage.vue';
import Loader from '@/components/layout/Loader.vue';
import AppError from '@/components/ui/Error.vue';

const series = ref<ISeries[]>([]);
const teams = ref<Record<string, ITeam>>({});
const config = ref<ITournamentConfig | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const activeStageId = ref<string | null>(null);

onMounted(async () => {
  try {
    const [s, t, c] = await Promise.all([
      api.series.getAll(),
      api.teams.getAll(),
      api.settings.getConfig()
    ]);

    series.value = s;
    teams.value = Object.fromEntries(
      t.map((team) => [team.id, team])
    );
    config.value = c;

    const hash = window.location.hash.replace('#', '');
    if (hash && c.stages.some(st => st.id === hash)) {
      activeStageId.value = hash;
    } else {
      let latestActive = c.stages[c.stages.length - 1]?.id || null;
      for (const st of c.stages) {
        const stSeries = s.filter(x => x.stageId === st.id);
        if (stSeries.some(x => x.status !== 'completed')) {
          latestActive = st.id;
          break;
        }
      }
      activeStageId.value = latestActive;
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error cargando el torneo';
  } finally {
    loading.value = false;
  }
});

watch(activeStageId, (newId) => {
  if (newId) {
    window.history.replaceState(null, '', `#${newId}`);
  }
});

const stages = computed<IStageConfig[]>(() => config.value?.stages ?? []);

const activeStage = computed<IStageConfig | null>(() => {
  if (!activeStageId.value) return null;
  return stages.value.find((s) => s.id === activeStageId.value) ?? null;
});
</script>

<template>
  <div v-if="loading" class="flex justify-center py-16">
    <Loader />
  </div>
  <AppError v-else-if="error" :error="error" />

  <div v-else-if="stages.length" class="space-y-6">
    <!-- MÓVIL: Selector de fase -->
    <div class="md:hidden">
      <div v-if="stages.length > 1" role="tablist" class="tabs tabs-lift mb-4">
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
      <h2 v-else class="text-lg font-bold mb-4">{{stages[0]?.name }}</h2>

      <!-- Renderizamos solo la fase activa en móvil -->
      <GroupsStage
        v-if="activeStage?.type === 'groups'"
        :stage-id="activeStage.id"
        :stage-name="activeStage.name"
        :series="series"
        :teams="teams"
        :qualify-count="(activeStage as any).qualification?.perGroupAutoQualify ?? 2"
        :best-others="(activeStage as any).qualification?.bestOthers ?? 0"
      />
      <KnockoutStage
        v-else-if="activeStage?.type === 'knockout'"
        :key="`knockout-${activeStage.id}`"
        :stage-id="activeStage.id"
        :stage-name="activeStage.name"
        :stage-config="(activeStage as any)"
        :series="series"
        :teams="teams"
      />
      <div v-else-if="activeStage" class="alert">
        La fase "{{ activeStage.name }}" es de tipo {{ activeStage.type }}, todavía sin vista dedicada.
      </div>
    </div>

    <!-- DESKTOP: Todo en columnas/scroll -->
    <div class="hidden md:flex flex-col gap-12">
      <div v-for="stage in stages" :key="`desktop-${stage.id}`" :id="stage.id" class="w-full">
        <h2 class="text-2xl font-black mb-6 pb-2 border-b border-base-300">{{ stage.name }}</h2>
        
        <GroupsStage
          v-if="stage.type === 'groups'"
          :stage-id="stage.id"
          :stage-name="stage.name"
          :series="series"
          :teams="teams"
          :qualify-count="(stage as any).qualification?.perGroupAutoQualify ?? 2"
          :best-others="(stage as any).qualification?.bestOthers ?? 0"
        />
        <KnockoutStage
          v-else-if="stage.type === 'knockout'"
          :key="`knockout-desktop-${stage.id}`"
          :stage-id="stage.id"
          :stage-name="stage.name"
          :stage-config="(stage as any)"
          :series="series"
          :teams="teams"
        />
        <div v-else class="alert">
          La fase "{{ stage.name }}" es de tipo {{ stage.type }}, todavía sin vista dedicada.
        </div>
      </div>
    </div>
  </div>
</template>
