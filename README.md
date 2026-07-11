# TruenoProClubTourney

Motor reutilizable para torneos amistosos de selecciones en FIFA Pro Clubs
(fase de grupos + eliminatorias, con terceros clasificados si el torneo lo
requiere). Monorepo pnpm.

## Estructura

```
packages/shared      → tipos TS compartidos entre backend y frontend
apps/backend         → Node + TS + Express + MongoDB (capas: model → service → controller → route)
apps/frontend        → Astro (full static) + Vue + Tailwind 4 + daisyUI 5
```

## Arrancar en local

```bash
pnpm install

# Backend
cp apps/backend/.env.example apps/backend/.env   # edita con tus valores
pnpm --filter @trueno-pro-club-tourney/shared build
pnpm dev:backend

# Frontend (en otra terminal)
cp apps/frontend/.env.example apps/frontend/.env
pnpm dev:frontend
```

O con Docker (backend + Mongo, y opcionalmente el frontend para dev):

```bash
docker compose up --build
```

## Cómo reutilizar esto para otro torneo

El torneo ya no asume "grupos + eliminatoria" fijo. `ITournamentConfig` tiene
un array `stages[]`, cada fase con su `type`:

- `groups` — fase de grupos clásica (nº de grupos y equipos por grupo,
  libres). Ya implementada de punta a punta.
- `knockout` — eliminación directa, genérica: se alimenta de cualquier fase
  anterior (grupos, liga suiza...) via `sourceA`/`sourceB` con `stageId`. Ya
  implementada de punta a punta.
- `swissLeague` — formato liga suiza (tipo Champions 2024+). El tipo existe
  en la config para que la arquitectura lo soporte, pero **el resolver no
  está implementado todavía** — es el próximo paso el día que haga falta.

Para un torneo nuevo:

1. Copia `apps/backend/src/config/tournament.example.ts` a
   `tournament.<nombre>.ts`
2. Define tus `stages[]` en orden (una fase de grupos con tantos grupos y
   equipos como quieras, seguida de una de `knockout` con su `bracket`)
3. Cambia `TOURNAMENT_CONFIG=<nombre>` en el `.env` del backend
4. Redeploy. Sin panel de admin para esto, a propósito.

### Selecciones o clubes, indistinto

`Team` admite `countryCode` (bandera, selecciones) o `logoUrl` (escudo,
clubes) — usa el que corresponda, el resto del sistema no distingue entre
ambos.

## Flujo de un torneo, de principio a fin

1. Admin crea los `Team` (nombre, bandera o escudo) y asigna capitanes
2. Admin corre el seed de la primera fase (grupos) → se crean las `Series`
   de esa fase, más las de `knockout` con `teamA`/`teamB` en `null` y su
   `source` apuntando a `{ stageId, group, position }` o `{ stageId, type: 'stageOthers' }`
3. Cada capitán configura el `eaClubId` de su equipo desde su panel
   (`PATCH /api/teams/:id/ea-club`) — hasta entonces no puede reportar
4. Se juega la fase de grupos. Cada capitán, partida a partida: elige una
   candidata de la API de EA o crea una manual, y confirma. Si el otro
   capitán confirma algo distinto, queda en disputa para un admin
5. Admin dispara `POST /api/admin/stages/:stageId/resolve` cuando esa fase
   está completa → se calculan clasificaciones y se rellenan los
   `teamA`/`teamB` de la fase siguiente
6. A partir de ahí, dentro de la fase de `knockout`, es automático: cada vez
   que una `Series` se completa, se propaga el ganador a la siguiente ronda
   sola (via `{ type: 'winnerOf', seriesId }`)

## Pendiente de enganchar (a propósito, son puntos de integración)

- `apps/backend/src/services/ea.service.ts` — la integración real con los
  endpoints de proclubs.ea.com (ya la tienes hecha en otro sitio, copiada en
  `packages/eafcapi`)
- `apps/backend/src/middleware/auth.ts` — confirmar que `ROOT_AUTH_URL` y el
  path `/get-session` coinciden con tu instalación real de Better Auth. Quién
  es admin se decide con `user.role === UserRole.admin` (de
  `@trueno-proclub-services/auth`, copiado en `packages/auth`) — no hay env
  var de admins, el rol ya viene resuelto desde la raíz
- El plugin `crossSubDomainCookies` de Better Auth, configurado **en la
  raíz**, es lo que hace que la sesión viaje al subdominio del torneo

## Despliegue

- **Backend**: Docker (`apps/backend/Dockerfile`) en tu servidor, con Mongo
  aparte o en el mismo `docker-compose.yml`
- **Frontend**: GitHub Pages vía `.github/workflows/deploy-frontend.yml`
  (push a `main` con cambios en `apps/frontend/**` o `packages/shared/**`
  dispara el deploy). Configura `PUBLIC_API_URL` y `PUBLIC_ROOT_AUTH_URL`
  como *Repository variables* en GitHub (Settings → Secrets and variables →
  Actions → Variables). También hay un `Dockerfile` del frontend por si
  algún día prefieres no usar GH Pages
