<script setup lang="ts">
import { watch } from "vue";
import { useAuth } from "@/composables/useAuth";

import ChevronDown from "@/assets/icons/chevron-down.svg?component";
import UserRound from "@/assets/icons/user-circle.svg?component";
import LogOut from "@/assets/icons/signout.svg?component";
import Shield from "@/assets/icons/shield.svg?component";
import LogIn from "@/assets/icons/signin.svg?component";

const { user, isLoggedIn, isPending, logout, isAdmin } = useAuth();


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
        class="btn btn-ghost rounded-full border border-base-300 bg-base-200 px-2 cursor-default"
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
        class="btn btn-ghost rounded-full border border-base-300 bg-base-200 hover:bg-base-300 px-2"
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
        class="dropdown-content menu mt-3 w-72 rounded-box border border-base-300 bg-base-200 p-2 shadow-xl"
      >

        <template v-if="isLoggedIn">

          <li class="menu-title">
            <span>{{ user?.name }}</span>
            <span class="text-xs opacity-60">{{ user?.email }}</span>
          </li>

          <!-- TODO -->
          <!--
          <li v-if="isCaptain">
            <a href="/capitan">
              <Trophy class="size-4"/>
              Panel de capitán
            </a>
          </li>
          -->

          <li v-if="isAdmin">
            <a href="/admin">
              <Shield class="size-4" />
              Administración
            </a>
          </li>

          <li>
            <button @click="logout()">
              <LogOut class="size-4" />
              Cerrar sesión
            </button>
          </li>

        </template>

        <template v-else>

          <li>
            <button @click="">
              <LogIn class="size-4" />
              Iniciar sesión
            </button>
          </li>

        </template>

      </ul>

    </template>

  </div>
</template>