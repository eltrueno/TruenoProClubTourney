import { authClient } from '@/lib/auth';
import { computed, ref } from 'vue';

const isLoggingIn = ref(false);

/**
 * Composable de sesión, mismo patrón que el resto de apps de
 * TruenoProClubServices: envuelve authClient.useSession() y añade helpers
 * de login/logout con popup de Twitch.
 */
export function useAuth() {
  const sessionState = authClient.useSession();

  const session = computed(() => sessionState.value?.data ?? null);
  const isPending = computed(() => sessionState.value?.isPending ?? false);
  const user = computed(() => session.value?.user ?? null);
  const isLoggedIn = computed(() => !!user.value);
  const isAdmin = computed(() => user.value?.role === 'admin');

  async function loginWithTwitchPopup(callbackURL?: string) {
    isLoggingIn.value = true;
    try {
      const { data } = await authClient.signIn.social({
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
          if (e.data === 'auth-success') {
            await authClient.getSession({ fetchOptions: { force: true } });
            isLoggingIn.value = false;
            if (callbackURL) window.location.href = callbackURL;
            else window.location.reload();
          }
        },
        { once: true }
      );
    } catch (error) {
      console.error('[useAuth] Error en login:', error);
      isLoggingIn.value = false;
    }
  }

  async function logout(callbackURL?: string) {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: async () => {
          if (callbackURL) window.location.href = callbackURL;
          else window.location.reload();
        },
      },
    });
  }

  return {
    session,
    user,
    isLoggedIn,
    isAdmin,
    isPending,
    isLoggingIn,
    loginWithTwitchPopup,
    logout,
  };
}
