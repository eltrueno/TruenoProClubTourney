<script setup lang="ts">
import { useAuth } from '@/composables/useAuth';
const { isAdmin } = useAuth();
</script>

<template>
  <div class="flex gap-2">
    <a href="/" class="btn btn-ghost btn-sm">Bracket</a>
    <a href="/capitan" class="btn btn-primary btn-sm">Panel capitán</a>
    <a v-if="isAdmin" href="/admin" class="btn btn-outline btn-sm">Admin</a>
  </div>
</template>
