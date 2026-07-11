# syntax=docker/dockerfile:1

FROM node:20-slim AS base
RUN corepack enable
WORKDIR /repo

# ---- deps: solo lo necesario para instalar (aprovecha cache de Docker) ----
FROM base AS deps
COPY pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/backend/package.json apps/backend/package.json
RUN pnpm install --frozen-lockfile --filter @trueno-pro-club-tourney/backend...

# ---- build ----
FROM base AS build
COPY --from=deps /repo /repo
COPY packages/shared packages/shared
COPY apps/backend apps/backend
RUN pnpm --filter @trueno-pro-club-tourney/backend build

# ---- runtime: imagen final, ligera, sin devDependencies ----
FROM node:20-slim AS runtime
WORKDIR /app
RUN corepack enable

COPY --from=build /repo/apps/backend/dist ./dist
COPY --from=build /repo/apps/backend/package.json ./package.json
COPY --from=build /repo/apps/backend/node_modules ./node_modules
COPY --from=build /repo/node_modules ./node_modules_root

ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "dist/index.js"]
