<script setup lang="ts">
import { computed } from 'vue';
import type { ITeam } from '@trueno-proclub-tourney/shared';
import { teamBadge } from '@/lib/api';

const props = defineProps<{
  team?: ITeam | null | any;
  url?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}>();

const badgeUrl = computed(() => {
  if (props.url !== undefined) return props.url;
  return teamBadge(props.team);
});

const isFlag = computed(() => badgeUrl.value?.includes('flagcdn.com'));

const sizeClasses = computed(() => {
  const flag = isFlag.value;
  switch (props.size) {
    case 'sm': return flag ? 'w-7 h-5 text-[8px] rounded-bl-lg rounded-tr-lg border-2 rounded-sm' : 'w-5 h-5 text-[8px]';
    case 'md': return flag ? 'w-11 h-8 text-[10px] rounded-bl-2xl rounded-tr-2xl border-2 rounded-sm' : 'w-8 h-8 text-[10px]';
    case 'lg': return flag ? 'w-20 h-14 text-xs rounded-bl-3xl rounded-tr-3xl border-2 rounded-md' : 'w-14 h-14 text-xs';
    case 'xl': return flag ? 'w-24 h-16 text-sm rounded-bl-4xl rounded-tr-4xl border-3 rounded-lg' : 'w-16 h-16 text-sm';
    default: return flag ? 'w-11 h-8 text-[10px] rounded-bl-2xl rounded-tr-2xl border-2 rounded-sm' : 'w-6 h-6 text-[10px]';
  }
});
</script>

<template>
  <div 
    class="relative shrink-0 flex items-center justify-center overflow-hidden bg-base-200/30 border border-white shadow-sm"
    :class="[sizeClasses]"
  >
    <img 
      v-if="badgeUrl" 
      :src="badgeUrl" 
      class="w-full h-full" 
      :class="isFlag ? 'object-cover p-0!' : 'object-contain p-0.5'" 
    />
    <span v-else class="opacity-40 font-bold w-full h-full flex items-center justify-center bg-base-300/50">?</span>
  </div>
</template>
