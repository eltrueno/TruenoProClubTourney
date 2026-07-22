<script setup lang="ts">
import { ref } from 'vue';
import { useAuth } from '@/composables/useAuth';
import AuthGuard from '@/components/auth/AuthGuard.vue';
import TeamsTab from './TeamsTab.vue';
import StagesTab from './StagesTab.vue';
import DisputesTab from './DisputesTab.vue';
import SettingsTab from './SettingsTab.vue';
import AppError from '../ui/Error.vue';

const { isAdmin } = useAuth();
const tab = ref<'teams' | 'stages' | 'disputes' | 'settings'>('teams');
</script>

<template>
  <AuthGuard>
    <template #loggedin>
      <div v-if="!isAdmin" class="w-full max-w-md mx-auto">
        <AppError error="No tienes permisos de administrador" />
      </div>

      <div v-else class="w-full">
        <div role="tablist" class="tabs tabs-boxed mb-6 inline-flex">
          <a role="tab" class="tab" :class="{ 'tab-active': tab === 'teams' }" @click="tab = 'teams'">Equipos</a>
          <a role="tab" class="tab" :class="{ 'tab-active': tab === 'stages' }" @click="tab = 'stages'">Fases</a>
          <a role="tab" class="tab" :class="{ 'tab-active': tab === 'disputes' }" @click="tab = 'disputes'">Disputas</a>
          <a role="tab" class="tab" :class="{ 'tab-active': tab === 'settings' }" @click="tab = 'settings'">Ajustes</a>
        </div>

        <div class="w-full">
          <TeamsTab v-if="tab === 'teams'" />
          <StagesTab v-else-if="tab === 'stages'" />
          <DisputesTab v-else-if="tab === 'disputes'" />
          <SettingsTab v-else-if="tab === 'settings'" />
        </div>
      </div>
    </template>
  </AuthGuard>
</template>
