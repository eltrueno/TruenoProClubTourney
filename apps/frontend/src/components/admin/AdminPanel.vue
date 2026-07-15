<script setup lang="ts">
import { ref } from 'vue';
import { useAuth } from '@/composables/useAuth';
import TeamsTab from './TeamsTab.vue';
import StagesTab from './StagesTab.vue';
import DisputesTab from './DisputesTab.vue';

const { isLoggedIn, isAdmin, isPending, loginWithTwitchPopup } = useAuth();
const tab = ref<'teams' | 'stages' | 'disputes'>('teams');
</script>

<template>
  <div v-if="isPending" class="flex justify-center py-16">
    <span class="loading loading-spinner loading-lg text-primary"></span>
  </div>

  <div v-else-if="!isLoggedIn" class="hero py-20">
    <div class="hero-content text-center">
      <div>
        <h2 class="text-2xl font-bold mb-4">Acceso restringido</h2>
        <button class="btn btn-primary" @click="loginWithTwitchPopup()">Iniciar sesión con Twitch</button>
      </div>
    </div>
  </div>

  <div v-else-if="!isAdmin" class="alert alert-warning max-w-md mx-auto">
    No tienes permisos de administrador.
  </div>

  <div v-else>
    <div role="tablist" class="tabs tabs-boxed mb-6 w-fit">
      <a role="tab" class="tab" :class="{ 'tab-active': tab === 'teams' }" @click="tab = 'teams'">Equipos</a>
      <a role="tab" class="tab" :class="{ 'tab-active': tab === 'stages' }" @click="tab = 'stages'">Fases</a>
      <a role="tab" class="tab" :class="{ 'tab-active': tab === 'disputes' }" @click="tab = 'disputes'">Disputas</a>
    </div>

    <TeamsTab v-if="tab === 'teams'" />
    <StagesTab v-else-if="tab === 'stages'" />
    <DisputesTab v-else-if="tab === 'disputes'" />
  </div>
</template>
