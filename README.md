# TruenoProClubTourney

Motor de torneos para **EA Sports FC Pro Clubs**, pensado para competiciones
amistosas entre equipos (selecciones o clubes) con fase de grupos +
eliminatorias. Cada equipo tiene un capitán, que es quien reporta los
resultados de sus partidos — los datos se obtienen automáticamente de la API
de EA cuando es posible, y se pueden corregir a mano cuando hace falta
(desconexiones, sanciones, partidos que EA no registró bien...).

No está atado a un torneo concreto: el formato (número de grupos, tamaño de
cada grupo, partido único o ida y vuelta, cruces de eliminatoria, mejores
terceros clasificados...) es configuración, no código.

## Características

- **Fase de grupos + eliminatorias**, con número de grupos y equipos por
  grupo totalmente configurables
- **Partido único o ida y vuelta** en fase de grupos, por configuración
- **Avance automático de fase**: en cuanto se completan todos los partidos
  de una fase, se calculan clasificaciones y se rellena la fase siguiente
  sola, sin intervención manual
- **Mejores clasificados no directos** (ej. "mejores terceros" al estilo
  Mundial/Champions), configurable
- **Reporte de resultados por capitán**: cada capitán solo puede tocar los
  partidos de su propio equipo, y necesita que el capitán rival confirme el
  mismo resultado — si no coinciden, queda en disputa para que lo resuelva
  un administrador
- **Integración con la API de EA**: los resultados se traen automáticamente
  del club correspondiente; el capitán elige cuál de los partidos jugados
  recientemente corresponde a cada partida del torneo, y puede editarlo
  manualmente si algo no cuadra
- **Auditoría completa**: cada edición manual queda registrada (quién,
  cuándo, qué cambió)
- **Selecciones o clubes**: los equipos pueden llevar bandera (por código de
  país) o escudo (URL de imagen), indistintamente
- **Autenticación externa**: se apoya en un servicio de auth ya existente
  (Better Auth) vía sesión compartida entre subdominios, con roles de
  usuario ya resueltos (no hay lista de administradores por variable de
  entorno)

## Arquitectura

Monorepo con pnpm workspaces:

```
apps/
  backend/     Node + TypeScript + Express + MongoDB (API REST)
  frontend/    Astro (salida 100% estática) + Vue + Tailwind 4 + daisyUI 5
packages/
  shared/                        tipos TypeScript compartidos entre backend y frontend
  auth/          (@trueno-proclub-services/auth)     cliente/tipos de autenticación
  eafcapi/       (@trueno-proclub-services/eafcapi)  cliente no oficial de la API de EA Pro Clubs
```

El backend sigue una arquitectura en capas por entidad:

```
model → service → controller → route
```

- **model**: esquemas de Mongoose
- **service**: lógica de negocio, sin saber nada de HTTP
- **controller**: valida la request, llama al service, da forma a la respuesta
- **route**: solo cablea rutas a controllers

### El modelo de datos, en resumen

- `Team` — un equipo (selección o club), con su bandera/escudo
- `Captain` — vincula un usuario autenticado con el equipo que capitanea
- `Series` — un enfrentamiento entre dos equipos (puede ser a partido único
  o al mejor de 3, según la fase). Contiene uno o varios `Match`
- `Match` (subdocumento de `Series`) — una partida individual, con el
  resultado "original" tal como lo dio la API de EA (inmutable) y el
  resultado "efectivo" (el que cuenta, editable), más el historial de
  ediciones y las confirmaciones de cada capitán

### Configuración del torneo

El formato del torneo no está en la base de datos ni en un panel de admin:
es un archivo TypeScript versionado en `apps/backend/src/config/`. Un
torneo se define como una lista ordenada de **fases** (`stages`), cada una
con su tipo:

- `groups` — fase de grupos clásica. Totalmente implementada, incluyendo
  clasificación automática y avance a la siguiente fase
- `knockout` — eliminación directa. Genérica: se puede alimentar de
  cualquier fase anterior
- `swissLeague` — liga suiza (formato Champions League 2024+). El tipo
  existe en la configuración para que la arquitectura lo soporte, pero el
  resolver todavía no está implementado

Para crear un torneo nuevo: copia `tournament.example.ts`, ajusta grupos,
formato (`matchFormat: 'single' | 'homeAndAway'`), desempates y el cuadro de
eliminatorias, y apunta `TOURNAMENT_CONFIG` a tu archivo. No hace falta
tocar nada más.

## Cómo funciona un torneo, de principio a fin

1. Un administrador crea los `Team` (nombre + bandera o escudo) y asigna un
   capitán a cada uno (usuario ya autenticado en el sistema)
2. Cada capitán configura el `eaClubId` de su equipo desde su propio panel
3. Un administrador genera el fixture de la fase de grupos
   (`POST /api/admin/stages/:stageId/seed`) — se crean automáticamente
   todas las series según el `matchFormat` configurado
4. Se juega la fase de grupos. Cada capitán, partida a partida: elige cuál
   de los partidos recientes de EA corresponde a esa partida del torneo (o
   la reporta a mano si hace falta) y confirma. Si el capitán rival
   confirma algo distinto, la partida queda en disputa
5. En cuanto se completan todas las series de la fase, el sistema calcula
   la clasificación y rellena automáticamente los emparejamientos de la
   fase de eliminatorias — sin que nadie tenga que dispararlo a mano
6. En eliminatorias, cada vez que una serie termina, el ganador se propaga
   solo a la siguiente ronda

## Puesta en marcha

```bash
pnpm install
```

> **Nota sobre `puppeteer`**: el paquete `eafcapi` usa Puppeteer para
> obtener sesión válida contra la API de EA. Si no necesitas ejecutarlo en
> local (por ejemplo, para trabajar solo en el frontend), puedes evitar la
> descarga del navegador con `PUPPETEER_SKIP_DOWNLOAD=true pnpm install`.

```bash
# Backend
cp apps/backend/.env.example apps/backend/.env   # edita con tus valores
pnpm --filter @trueno-pro-club-tourney/shared build
pnpm dev:backend

# Frontend (en otra terminal)
cp apps/frontend/.env.example apps/frontend/.env
pnpm dev:frontend
```

O con Docker (backend + Mongo; el frontend también tiene su propio
`Dockerfile` para desarrollo local):

```bash
docker compose up --build
```

## Variables de entorno del backend

| Variable | Descripción |
|---|---|
| `PORT` | Puerto del servidor (por defecto 4000) |
| `MONGO_URI` | Conexión a MongoDB |
| `ROOT_AUTH_URL` | URL base de la API de autenticación (Better Auth) |
| `FRONTEND_ORIGIN` | Origen permitido para CORS |
| `TOURNAMENT_CONFIG` | Qué archivo `tournament.<nombre>.ts` cargar |

Quién es administrador **no** se configura por variable de entorno: se
resuelve a partir del `role` que ya trae el usuario autenticado
(`UserRole.admin`).

## Despliegue

- **Backend**: Docker (`apps/backend/Dockerfile`), con Mongo aparte o en el
  mismo `docker-compose.yml`. Necesita Chrome/Chromium instalado en la
  imagen para que Puppeteer funcione (`apt-get install chromium` +
  `PUPPETEER_EXECUTABLE_PATH`)
- **Frontend**: GitHub Pages, vía `.github/workflows/deploy-frontend.yml`.
  Ojo con un detalle de monorepo: el workflow instala **solo** lo que el
  frontend necesita (`pnpm install --filter frontend...`), a propósito —
  instalar el workspace completo arrastraría `puppeteer`, cuyo script de
  postinstall intenta descargar Chrome desde Google y puede fallar (403) en
  los runners de GitHub Actions, tirando el deploy entero sin necesidad,
  ya que el frontend no usa esa dependencia para nada
  - Configura `PUBLIC_API_URL` y `PUBLIC_ROOT_AUTH_URL` como *Repository
    variables* (Settings → Secrets and variables → Actions → Variables)
  - Recuerda activar GitHub Pages con origen "GitHub Actions" en
    Settings → Pages

## Puntos de integración pendientes de tu entorno

Estos archivos son plantillas/adaptadores a propósito, para que cada
despliegue conecte sus propios servicios:

- `apps/backend/src/config/tournament.*.ts` — la configuración de cada torneo
- `packages/eafcapi` — cliente de la API de EA (requiere Puppeteer + Chrome)
- `packages/auth` — cliente de autenticación (Better Auth), con roles de
  usuario y vinculación de cuenta de Twitch
