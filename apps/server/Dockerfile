FROM node:20-bookworm
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json apps/server/package.json
COPY apps/client/package.json apps/client/package.json

RUN pnpm install --frozen-lockfile

COPY apps/server apps/server

RUN pnpm --filter server prisma:generate

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000
CMD ["pnpm", "--filter", "server", "start"]
