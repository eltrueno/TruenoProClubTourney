<script setup lang="ts">
import { watch, onMounted } from "vue";
import { useAuth } from "@/composables/useAuth";

const { logout, isLoggedIn, isPending } = useAuth();

onMounted(() => {
    watch(
        isPending,
        async (pending) => {
            if (pending) return;

            const redirect =
                new URLSearchParams(location.search).get("redirect") ?? "/";

            if (!isLoggedIn.value) {
                window.location.replace(redirect);
                return;
            }

            await logout(false, redirect);
        },
        { immediate: true }
    );

    console.log("[LOGOUT] mounted");

    watch(isPending, (v) => {
        console.log("[LOGOUT] pending", v);
    });

    watch(isLoggedIn, (v) => {
        console.log("[LOGOUT] logged", v);
});
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