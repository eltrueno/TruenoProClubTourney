# syntax=docker/dockerfile:1

# ---- base ----
FROM node:24-bookworm-slim AS base

RUN corepack enable
WORKDIR /repo

# ---- deps ----
FROM base AS deps

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

COPY packages/shared/package.json packages/shared/package.json
COPY packages/auth/package.json packages/auth/package.json
COPY packages/eafcapi/package.json packages/eafcapi/package.json
COPY apps/backend/package.json apps/backend/package.json

RUN pnpm install --frozen-lockfile --filter @trueno-pro-club-tourney/backend...

# ---- build ----
FROM base AS build

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

COPY --from=deps /repo /repo

COPY packages/shared packages/shared
COPY packages/auth packages/auth
COPY packages/eafcapi packages/eafcapi
COPY apps/backend apps/backend

# Compila todo el workspace
RUN pnpm -r build

# Genera una versión autocontenida para producción
RUN pnpm deploy --legacy --filter @trueno-pro-club-tourney/backend --prod /deploy

# ---- runtime ----
FROM node:24-bookworm-slim AS runtime

RUN corepack enable

# Chromium para Puppeteer
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-khmeros \
    fonts-kacst \
    fonts-freefont-ttf \
    libxss1 \
    dbus \
    dbus-x11 \
    --no-install-recommends \
 && rm -rf /var/lib/apt/lists/*

# Usuario sin privilegios
RUN groupadd -r pptruser \
 && useradd -rm -g pptruser -G audio,video pptruser

WORKDIR /app

COPY --from=build /deploy ./

ENV NODE_ENV=production
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_CACHE_DIR=/tmp/puppeteer

EXPOSE 4000

USER pptruser 

CMD ["node", "dist/index.js"]