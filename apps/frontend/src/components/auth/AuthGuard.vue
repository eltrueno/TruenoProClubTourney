<script setup lang="ts">
import { ref, onMounted } from "vue"
import { useAuth } from "@/composables/useAuth"
import LoginWall from "@/components/auth/LoginWall.vue"
import Loader from "@/components/layout/Loader.vue"
const props = defineProps<{
  role?: string
}>()

const { isLoggedIn, isPending, user, logout } = useAuth()
const isMounted = ref(false)

onMounted(() => {
  isMounted.value = true
})
</script>

<template>
  <div v-if="!isMounted || isPending">
    <slot name="pending">
      <div class="w-full min-h-[80vh] flex flex-col items-center justify-center gap-6">
        <Loader class="scale-125 mb-4" />
    <div class="space-y-2 text-center animate-pulse">
      <p class="text-sm font-black tracking-[0.3em] uppercase opacity-70 text-base-content">Verificando sesión</p>
      <div class="flex justify-center gap-1">
        <span class="w-1.5 h-1.5 rounded-full bg-primary/40"></span>
        <span class="w-1.5 h-1.5 rounded-full bg-primary/60"></span>
        <span class="w-1.5 h-1.5 rounded-full bg-primary/40"></span>
      </div>
    </div>
      </div>
    </slot>
  </div>

  <div v-else-if="!isLoggedIn">
    <slot name="loggedout">
        <LoginWall />
    </slot>
  </div>

  <div v-else>
    <slot name="loggedin">
        <div class="w-full flex flex-col items-center gap-6">
           <div class="avatar shadow-2xl rounded-full ring ring-primary ring-offset-base-100 ring-offset-4 mb-2">
             <div class="w-24 rounded-full bg-neutral">
               <img :src="user.image" :alt="user.name" />
             </div>
           </div>
           <div class="space-y-1">
             <h2 class="text-3xl font-bold tracking-tight text-primary">{{ user.name }}</h2>
           </div>
           
           <div class="divider opacity-10 px-4"></div>
           
           <div class="card-actions w-full px-4">
             <button @click="logout(true)" class="btn btn-outline btn-error btn-block gap-2 border-2 hover:bg-error hover:text-white transition-all duration-300">
               <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
               </svg>
               Cerrar Sesión
             </button>
           </div>
        </div>
    </slot>
  </div>
</template>