# syntax=docker/dockerfile:1
# Nota: en producción el frontend se publica en GitHub Pages (ver
# .github/workflows/deploy-frontend.yml) porque es 100% estático. Esta
# imagen es para levantarlo en local/dev de forma consistente, o como plan B.

FROM node:20-slim AS base
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/frontend/package.json apps/frontend/package.json
RUN pnpm install --frozen-lockfile --filter @trueno-pro-club-tourney/frontend...

FROM base AS build
COPY --from=deps /repo /repo
COPY packages/shared packages/shared
COPY apps/frontend apps/frontend
RUN pnpm --filter @trueno-pro-club-tourney/frontend build

# Imagen final: solo estáticos servidos por un servidor ligero
FROM node:20-slim AS runtime
WORKDIR /app
RUN npm install -g serve
COPY --from=build /repo/apps/frontend/dist ./dist

EXPOSE 4321
CMD ["serve", "-s", "dist", "-l", "4321"]
