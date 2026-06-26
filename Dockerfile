FROM node:20-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.5.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install --frozen-lockfile

COPY apps/server apps/server
COPY apps/web apps/web
COPY packages/shared packages/shared
COPY packages/canvases packages/canvases
COPY packages/case-library packages/case-library
COPY apps/cli/build/skill apps/cli/build/skill

RUN pnpm --filter @pingarden/shared run build \
  && pnpm --filter @pingarden/web run build \
  && pnpm --filter @pingarden/server run build

ENV NODE_ENV=production \
  HOST=0.0.0.0 \
  PORT=3000 \
  DATA_DIR=/tmp/pingarden-data \
  WEB_DIST_DIR=/app/apps/web/dist \
  CANVAS_DEFS_DIR=/app/packages/canvases \
  CASE_LIBRARY_DIR=/app/packages/case-library \
  SKILL_PACK_DIR=/app/apps/cli/build/skill \
  PINGARDEN_AI_PROVIDER=kimi-http \
  PINGARDEN_KIMI_HTTP_TIMEOUT_MS=120000

EXPOSE 3000

CMD ["node", "apps/server/dist/server.js"]
