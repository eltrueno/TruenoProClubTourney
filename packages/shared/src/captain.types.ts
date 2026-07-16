export interface ICaptain {
  id: string;
  /** userId que da Better Auth (login con Twitch) en la raiz */
  userId: string;
  /** Nombre del capitan, resuelto y cacheado desde el auth server al asignarlo */
  userName?: string;
  teamId: string;
  createdAt: string;
}
