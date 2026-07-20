<script setup lang="ts">
import { onMounted } from "vue";
import { useAuth } from "@/composables/useAuth";

const { logout } = useAuth();

onMounted(() => {
    const redirect = new URLSearchParams(location.search).get("redirect");
    if (!redirect) {
        logout(true);
        return;
    }
    logout(false, redirect);
});
</script>

<template>
    <div class="min-h-[80vh] flex items-center justify-center">
        <div class="flex flex-col items-center gap-4">
            <span class="loading loading-ring loading-lg text-primary"></span>
            <p class="opacity-70">Cerrando sesión...</p>
        </div>
    </div>
</template>