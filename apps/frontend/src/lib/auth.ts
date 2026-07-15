import { createAuthClient } from 'better-auth/vue';
import { inferAdditionalFields } from 'better-auth/client/plugins';
import type { AuthType } from '@trueno-proclub-services/auth';

const BASE_URL = import.meta.env.PUBLIC_AUTH_URL ?? 'https://auth.casemurocity.org';

export const authClient = createAuthClient({
  baseURL: BASE_URL,
  plugins: [inferAdditionalFields<AuthType>()],
});

// Re-exportamos User para que los componentes no importen de auth directamente
export type { User } from '@trueno-proclub-services/auth';
