import { authClient } from '@/lib/auth';
import { computed, ref, watch } from 'vue';
import type { ITeam } from '@trueno-proclub-tourney/shared';
import { api } from '@/lib/api';

const isLoggingIn = ref(false);

/**
 * Composable de sesión, mismo patrón que el resto de apps de
 * TruenoProClubServices: envuelve authClient.useSession() y añade helpers
 * de login/logout con popup de Twitch.
 */

const sessionState = authClient.useSession();

const session = computed(() => sessionState.value?.data ?? null);
const isPending = computed(() => sessionState.value?.isPending ?? false);
const user = computed(() => session.value?.user ?? null);
const isLoggedIn = computed(() => !!user.value);
const isAdmin = computed(() => user.value?.role === "admin");

const myTeam = ref<ITeam | null>(null);

const isCaptain = computed(() => {
  if (!isLoggedIn.value || !myTeam.value) return false;

  return (
    user.value?.name.toLowerCase() ===
    myTeam.value.captainName?.toLowerCase()
  );
});

async function loadMyTeam() {
  isLoggingIn.value = true;
  try {
    myTeam.value = await api.teams.getMine();
  } catch {
    myTeam.value = null;
  } finally {
    isLoggingIn.value = false;
  }
}

watch(
  [isPending, user],
  async ([pending, currentUser]) => {
    if (pending) return;

    if (!currentUser) {
      myTeam.value = null;
      return;
    }

    await loadMyTeam();
  },
  { immediate: true }
);

export function useAuth() {
  async function loginWithTwitchPopup(callbackURL?: string, silent = false) {
    isLoggingIn.value = true;
    try {
      const { data } = silent ? await authClient.signIn.social({
        provider: 'twitch',
        callbackURL: `${window.location.origin}/authcallback?redirect=${encodeURIComponent(callbackURL ?? "/")}`,
        disableRedirect: true,
      }) : await authClient.signIn.social({
        provider: 'twitch',
        callbackURL: `${window.location.origin}/authcallback`,
        disableRedirect: true,
      });

      if (!data?.url) {
        isLoggingIn.value = false;
        return;
      }

      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      window.open(data.url, 'Login con Twitch', `width=${width},height=${height},left=${left},top=${top}`);

      window.addEventListener(
        'message',
        async (e) => {
          if (e.origin !== window.location.origin) return;
          if (e.data?.type !== "auth-success") return;
          await authClient.getSession({ fetchOptions: { force: true } });
          isLoggingIn.value = false;
          if (!silent) {
            window.location.href = e.data.redirect;
          } else {
            window.location.reload();
          }
        },
        { once: true }
      );
    } catch (error) {
      isLoggingIn.value = false;
    }
  }

  async function logout(silent?: boolean, callbackURL?: string) {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: async () => {
          await authClient.getSession({ fetchOptions: { force: true } });
          if (!silent) window.location.href = callbackURL ?? "/"
          else window.location.reload()
        }
      }
    })
  }



  return {
    session,
    user,
    isLoggedIn,
    isAdmin,
    isCaptain,
    isPending,
    isLoggingIn,
    loginWithTwitchPopup,
    logout,
  };
}
