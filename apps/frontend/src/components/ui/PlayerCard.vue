<script setup lang="ts">
import { computed } from 'vue';

export interface PlayerCardStat {
  label: string;
  value: string | number;
  emphasis?: boolean;
}

const props = defineProps<{
  name: string;
  position?: string | null;
  rating?: number | null;
  mvp?: boolean | number;
  redCards?: number | null;
  stats: PlayerCardStat[];
  href?: string | null;
}>();

const posLabel: Record<string, string> = {
  goalkeeper: 'POR',
  defender: 'DEF',
  midfielder: 'MED',
  forward: 'DEL',
};

const shortPosition = computed(() => (props.position ? posLabel[props.position] ?? null : null));

const initials = computed(() => {
  const parts = props.name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
});

const ratingClass = computed(() => {
  const r = props.rating;
  if (r == null) return 'badge-ghost';
  if (r >= 8) return 'badge-success';
  if (r >= 6.5) return 'badge-warning';
  return 'badge-error';
});

const mvpCount = computed(() => (typeof props.mvp === 'number' ? props.mvp : props.mvp ? 1 : 0));

const statsGridClass = computed(() => {
  const n = props.stats.length;
  if (n <= 1) return 'grid-cols-1';
  if (n === 2) return 'grid-cols-2';
  if (n === 3) return 'grid-cols-3';
  return 'grid-cols-2';
});
</script>

<template>
  <component
    :is="href ? 'a' : 'div'"
    :href="href ?? undefined"
    class="relative flex flex-col gap-2.5 rounded-xl border bg-base-100 p-3 transition-all"
    :class="[
      href ? 'hover:border-primary/50 hover:-translate-y-0.5 cursor-pointer' : '',
      mvpCount > 0 ? 'border-primary/40' : 'border-base-300',
    ]"
  >
    <span
      v-if="mvpCount > 0"
      class="absolute -top-2 -right-2 text-sm leading-none drop-shadow"
      :title="`MVP${mvpCount > 1 ? ` x${mvpCount}` : ''}`"
    >
      ⭐<span v-if="mvpCount > 1" class="text-[9px] font-black align-top">{{ mvpCount }}</span>
    </span>

    <div class="flex items-center gap-2.5">
      <div
        class="shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-black text-xs"
        style="background: linear-gradient(160deg, var(--color-secondary), var(--color-primary)); color: var(--color-primary-content)"
      >
        {{ initials }}
      </div>
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-1">
          <span v-if="shortPosition" class="badge badge-ghost badge-xs font-bold">{{ shortPosition }}</span>
          <span v-if="redCards" class="text-[10px]" title="Tarjetas rojas">🟥{{ redCards > 1 ? redCards : '' }}</span>
        </div>
        <div class="font-bold text-sm truncate leading-tight">{{ name }}</div>
      </div>
      <div v-if="rating != null" class="badge badge-sm font-black shrink-0" :class="ratingClass">
        {{ rating.toFixed(1) }}
      </div>
    </div>

    <div v-if="stats.length" class="grid gap-1.5" :class="statsGridClass">
      <div v-for="s in stats" :key="s.label" class="text-center bg-base-200/60 rounded-lg py-1.5 px-1 min-w-0">
        <div class="text-sm font-black truncate" :class="s.emphasis ? 'text-primary' : ''">{{ s.value }}</div>
        <div class="text-[9px] uppercase font-bold opacity-50 truncate">{{ s.label }}</div>
      </div>
    </div>
  </component>
</template>
