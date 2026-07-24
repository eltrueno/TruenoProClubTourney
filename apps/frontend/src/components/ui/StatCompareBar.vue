<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    label: string;
    valueA: number;
    valueB: number;
    suffix?: string;
    higherIsBetter?: boolean;
  }>(),
  { suffix: '', higherIsBetter: true }
);

const total = computed(() => props.valueA + props.valueB);
const pctA = computed(() => (total.value > 0 ? (props.valueA / total.value) * 100 : 50));
const pctB = computed(() => 100 - pctA.value);

const leadA = computed(() => {
  if (props.valueA === props.valueB) return false;
  return props.higherIsBetter ? props.valueA > props.valueB : props.valueA < props.valueB;
});
const leadB = computed(() => {
  if (props.valueA === props.valueB) return false;
  return props.higherIsBetter ? props.valueB > props.valueA : props.valueB < props.valueA;
});
</script>

<template>
  <div class="space-y-1.5">
    <div class="flex items-center justify-between gap-2 text-xs font-black tabular-nums">
      <span :class="leadA ? 'text-primary' : 'opacity-60'">{{ valueA }}{{ suffix }}</span>
      <span class="text-[9px] uppercase font-bold opacity-40 tracking-wide text-center truncate">{{ label }}</span>
      <span :class="leadB ? 'text-primary' : 'opacity-60'">{{ valueB }}{{ suffix }}</span>
    </div>
    <div class="flex h-1.5 rounded-full overflow-hidden bg-base-300">
      <div class="h-full bg-primary transition-all duration-300" :style="{ width: pctA + '%' }"></div>
      <div class="h-full bg-secondary/80 transition-all duration-300" :style="{ width: pctB + '%' }"></div>
    </div>
  </div>
</template>
