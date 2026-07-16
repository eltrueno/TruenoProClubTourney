import type { Request, Response, NextFunction } from 'express';
import { UserRole, type User } from '@trueno-proclub-tourney/auth';

declare global {
  namespace Express {
    interface Request {
      /** Usuario tal cual lo devuelve el Better Auth de la raiz, con su role real */
      user?: User;
      isAdmin?: boolean;
    }
  }
}

async function fetchSession(cookieHeader: string): Promise<User | null> {
  const rootAuthUrl = process.env.ROOT_AUTH_URL;
  if (!rootAuthUrl) throw new Error('Falta ROOT_AUTH_URL en las variables de entorno');

  const res = await fetch(`${rootAuthUrl}/get-session`, {
    headers: { cookie: cookieHeader },
  });

  if (!res.ok) return null;
  const data = (await res.json()) as { user?: User } | null;
  return data?.user ?? null;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const cookieHeader = req.headers.cookie ?? '';
    const user = await fetchSession(cookieHeader);

    if (!user) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }

    req.user = user;
    // El rol ya viene resuelto por la raiz (Better Auth), no hace falta ADMIN_USER_IDS
    req.isAdmin = user.role === UserRole.admin;

    next();
  } catch (err) {
    console.error('[auth] Error validando sesion:', err);
    res.status(502).json({ error: 'No se pudo verificar la sesion' });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.isAdmin) {
    res.status(403).json({ error: 'Requiere permisos de administrador' });
    return;
  }
  next();
}
