import { ref, type Ref } from 'vue';
import { ApiError } from '@/lib/api';

export interface ApiErrorState {
  code: string;
  message: string;
}

/**
 * Composable generico para llamadas a la API. Sustituye al patron de clase
 * FetchService: en vez de heredar una clase por cada recurso, se envuelve
 * la funcion de api.ts que corresponda.
 *
 * Uso:
 *   const { data: teams, loading, error, execute: loadTeams } = useApi(api.getTeams)
 *   onMounted(loadTeams)
 *
 *   const { loading: saving, error: saveError, execute: save } = useApi(api.createTeam)
 *   await save({ name, countryCode })
 */
export function useApi<T, Args extends unknown[] = []>(fn: (...args: Args) => Promise<T>) {
  const data = ref<T | null>(null) as Ref<T | null>;
  const loading = ref(false);
  const error = ref<ApiErrorState | null>(null);

  async function execute(...args: Args): Promise<T | null> {
    loading.value = true;
    error.value = null;
    try {
      const result = await fn(...args);
      data.value = result;
      return result;
    } catch (e) {
      error.value =
        e instanceof ApiError
          ? { code: e.code, message: e.message }
          : { code: 'UNKNOWN_ERROR', message: e instanceof Error ? e.message : 'Error desconocido' };
      return null;
    } finally {
      loading.value = false;
    }
  }

  return { data, loading, error, execute };
}
