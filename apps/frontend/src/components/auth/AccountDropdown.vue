<script setup lang="ts">
import { watch } from "vue";
import { useAuth } from "@/composables/useAuth";

import ChevronDown from "@/assets/icons/chevron-down.svg?component";
import UserRound from "@/assets/icons/user-circle.svg?component";
import LogOut from "@/assets/icons/signout.svg?component";
import Shield from "@/assets/icons/shield-check.svg?component";
import LogIn from "@/assets/icons/signin.svg?component";
import Captain from "@/assets/icons/copyright.svg?component";
import { translateRole } from "@/i18n/translations";

const { user, isLoggedIn, isPending, logout, isAdmin, isCaptain } = useAuth();


watch(
  isPending,
  async (pending) => {
    if (pending) return;
    if (!isLoggedIn.value) return; 
    //TODO
  },
  { immediate: true }
);

</script>   

<template>
  <div class="dropdown dropdown-end">

    <!-- Skeleton loading -->
    <template v-if="isPending">
      <div
        class="btn btn-ghost rounded-2xl border border-base-300 bg-base-300 px-2 cursor-default shadow-md"
      >
        <div class="skeleton size-10 rounded-full shrink-0"></div>

        <div class="hidden lg:flex flex-col gap-1">
          <div class="skeleton h-3 w-24"></div>
        </div>

        <ChevronDown class="size-4 opacity-30" />
      </div>
    </template>

    <template v-else>

      <div
        tabindex="0"
        role="button"
        class="btn btn-ghost rounded-2xl border border-base-300 bg-base-300 hover:bg-base-300 px-2 shadow-md"
      >

        <div class="avatar">

          <img
            v-if="isLoggedIn && user?.image"
            :src="user.image"
            class="size-8 rounded-full object-cover"
          />

          <div
            v-else
            class="size-8 rounded-full bg-base-300 flex items-center justify-center"
          >
            <UserRound class="size-8 opacity-70" />
          </div>

        </div>

        <span class="hidden lg:inline font-medium">
          {{ isLoggedIn ? user?.name : "Iniciar sesión" }}
        </span>

        <ChevronDown class="size-4 opacity-70" />

      </div>

      <ul
        tabindex="0"
        class="dropdown-content menu mt-3 w-72 rounded-box border border-base-300 bg-base-300 p-2 shadow-xl gap-2"
      >

        <template v-if="isLoggedIn">

          <li class="menu-title cursor-default pointer-events-none my-1 flex flex-col items-center justify-center text-center">
            <span class="font-semibold text-lg leading-tight">{{ user?.name }}</span>
            <span class="mt-1 badge badge-primary badge-sm uppercase text-sm leading-tight p-1">{{ user?.role ? translateRole(user.role) : 'Visitante' }}</span>
          </li>

          <!-- TODO -->
          <li v-if="isCaptain">
            <a href="/capitan" class="btn btn-ghost flex items-center justify-start gap-3">
              <Captain class="size-6"/>
              Panel de capitán
            </a>
          </li>

          <li v-if="isAdmin">
            <a href="/admin" class="btn btn-ghost flex items-center justify-start gap-3">
              <Shield class="size-4" />
              Panel de admin
            </a>
          </li>
          
          <div class="divider my-0"></div>

          <li>
            <a href="/logout" class="btn btn-soft btn-error flex items-center justify-start gap-3" data-astro-reload>
              <LogOut class="size-4" />
              Cerrar sesión
            </a>
          </li>

        </template>

        <template v-else>

          <li>
            <a href="/login?redirect=/" class="btn btn-ghost flex items-center justify-start gap-3" data-astro-reload>
              <LogIn class="size-4" />
              Iniciar sesión
            </a>
          </li>

        </template>

      </ul>

    </template>

  </div>
</template>