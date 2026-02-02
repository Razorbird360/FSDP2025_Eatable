FROM node:20-bookworm AS build
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/client/package.json apps/client/package.json
COPY apps/server/package.json apps/server/package.json

RUN pnpm install --frozen-lockfile

COPY apps/client apps/client

WORKDIR /app/apps/client
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_API_BASE_URL
ARG VITE_AI_WS_URL
ARG VITE_GOOGLE_MAPS_API_KEY
ARG VITE_GOOGLE_MAP_ID

ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_AI_WS_URL=${VITE_AI_WS_URL}
ENV VITE_GOOGLE_MAPS_API_KEY=${VITE_GOOGLE_MAPS_API_KEY}
ENV VITE_GOOGLE_MAP_ID=${VITE_GOOGLE_MAP_ID}

RUN pnpm build

FROM nginx:1.27-alpine
COPY apps/client/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/client/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
