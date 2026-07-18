<script setup lang="ts">
import { ref } from 'vue';
import { api } from '@/lib/api';
import { useApi } from '@/composables/useApi';

const stageId = ref('');
const { loading: seeding, error: seedError, data: seedResult, execute: seed } = useApi(api.series.admin.seedGroupsStage);
const { loading: resolving, error: resolveError, data: resolveResult, execute: resolve } = useApi(api.series.admin.resolveStage);

async function doSeed() {
  if (stageId.value) await seed(stageId.value);
}
async function doResolve() {
  if (stageId.value) await resolve(stageId.value);
}
</script>

<template>
  <div class="card bg-base-100 shadow-sm max-w-lg">
    <div class="card-body space-y-4">
      <div>
        <label class="label"><span class="label-text">ID de la fase (según tournament.config.ts)</span></label>
        <input v-model="stageId" placeholder="ej. grupos" class="input input-bordered input-sm w-full" />
      </div>

      <div class="flex gap-2">
        <button class="btn btn-primary btn-sm" :disabled="!stageId || seeding" @click="doSeed">
          {{ seeding ? 'Generando...' : 'Generar fixture (seed)' }}
        </button>
        <button class="btn btn-secondary btn-sm" :disabled="!stageId || resolving" @click="doResolve">
          {{ resolving ? 'Resolviendo...' : 'Resolver fase → siguiente' }}
        </button>
      </div>

      <p class="text-xs opacity-50">
        <strong>Generar fixture</strong>: crea todas las series de una fase de grupos (todos contra todos, según <code>matchFormat</code>).<br />
        <strong>Resolver fase</strong>: normalmente es automático al completarse todas las series, pero puedes forzarlo aquí.
      </p>

      <div v-if="seedError" class="alert alert-error text-sm">{{ seedError.message }}</div>
      <div v-if="seedResult" class="alert alert-success text-sm">{{ seedResult.status.message }}</div>
      <div v-if="resolveError" class="alert alert-error text-sm">{{ resolveError.message }}</div>
      <div v-if="resolveResult" class="alert alert-success text-sm">{{ resolveResult.status.message }}</div>
    </div>
  </div>
</template>
