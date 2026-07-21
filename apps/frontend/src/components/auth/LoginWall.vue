<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useAuth } from "@/composables/useAuth"
import { authClient } from '@/lib/auth'

const { isLoggedIn, isPending, isLoggingIn, loginWithTwitchPopup } = useAuth()
const acceptedPrivacy = ref(false)


async function refreshSession() {
  await authClient.getSession({
    fetchOptions: {
      force: true,
    },
  });
}

function onPageShow(e: PageTransitionEvent) {
  if (e.persisted) {
    refreshSession();
  }
}

onMounted(() => {
  window.addEventListener("pageshow", onPageShow);
});

onUnmounted(() => {
  window.removeEventListener("pageshow", onPageShow);
});


</script>

<template>
  <div class="min-h-[80vh] flex items-center justify-center p-4">
    <div class="card w-full max-w-md bg-base-200/50 shadow-2xl border border-white/5 backdrop-blur-xl">
      <div class="card-body items-center text-center py-10">
        
        <!-- Estado de carga -->
        <div v-if="isPending" class="flex flex-col items-center gap-6 py-8">
           <span class="loading loading-ring loading-lg text-primary scale-125"></span>
           <div class="space-y-2">
             <p class="text-sm font-black tracking-widest uppercase opacity-70 animate-pulse">Verificando sesión</p>
             <p class="text-xs opacity-40">Por favor, espera un momento...</p>
           </div>
        </div>

        <!-- No Logueado -->
        <div v-else-if="!isLoggedIn" class="w-full flex flex-col items-center gap-10">
           <div class="relative">
             <div class="absolute inset-0 bg-primary/20 blur-3xl rounded-full"></div>
             <div class="relative bg-base-300 p-6 rounded-3xl border border-white/10 shadow-inner">
               <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
               </svg>
             </div>
           </div>
           
           <div class="space-y-3">
             <h2 class="text-4xl font-black tracking-tighter uppercase">Mi Cuenta</h2>
             <p class="text-sm opacity-60 leading-relaxed px-4">Inicia sesión para acceder al panel de tu equipo</p>
           </div>

           <div class="card-actions w-full px-2 sm:px-4 flex-col gap-4">
             <div class="flex items-center gap-3 cursor-pointer group select-none" @click="acceptedPrivacy = !acceptedPrivacy">
               <input type="checkbox" v-model="acceptedPrivacy" class="checkbox checkbox-primary checkbox-sm" @click.stop />
               <span class="text-xs opacity-70 group-hover:opacity-100 transition-opacity">
                 He leído y acepto la 
                 <a class="link link-primary font-bold no-underline hover:underline" href="/privacy">política de privacidad</a>
               </span>
             </div>

             <div :class="['w-full', { 'tooltip tooltip-bottom tooltip-error': !acceptedPrivacy }]" data-tip="Debes aceptar la política de privacidad">
               <button 
                 @click="loginWithTwitchPopup('/',false)" 
                 :disabled="!acceptedPrivacy || isLoggingIn"
                 class="btn bg-[#9146FF] hover:bg-[#772ce8] border-none text-white btn-block btn-md sm:btn-lg gap-2 sm:gap-3 shadow-[0_10px_30px_rgba(145,70,255,0.3)] transition-all duration-300 active:scale-[0.98] font-black tracking-tight sm:tracking-wider group text-xs sm:text-base disabled:bg-[#9146FF]/30 disabled:text-white/30 disabled:cursor-not-allowed"
               >
                 <span v-if="isLoggingIn" class="loading loading-spinner loading-md"></span>
                 <template v-else>
                   <svg class="h-5 w-5 sm:h-6 sm:w-6 transition-transform group-hover:scale-110" fill="currentColor" viewBox="0 0 24 24">
                     <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
                   </svg>
                   <span class="whitespace-nowrap">ENTRAR CON TWITCH</span>
                 </template>
               </button>
             </div>
           </div>
        </div>

      </div>
    </div>
  </div>


</template>

<style scoped>
.card {
  background-image: radial-gradient(circle at top right, rgba(200, 13, 13, 0.05), transparent 40%);
}
</style>