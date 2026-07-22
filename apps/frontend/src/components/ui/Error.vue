<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  error?: string;
}>();

const errorMessage = computed(() => {
  return props.error || 'Ha ocurrido un error inesperado.';
});
</script>

<template>
  <div class="flex-1 flex flex-col items-center justify-center p-8 text-center w-full">
    <img 
      src="/ilustrations/500servererror.svg" 
      alt="500 server error image" 
      class="w-full max-w-75 mb-6 drop-shadow-sm" 
    />
    <h2 class="text-2xl font-black mb-3">
      El VAR está revisando la jugada:<br> Acción anulada
    </h2>
    <p class="text-lg opacity-70 max-w-md">
      {{ errorMessage }}
    </p>
  </div>
</template>
