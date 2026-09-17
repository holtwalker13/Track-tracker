FROM node:22-bookworm-slim AS base
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json package-lock.json ./
# postinstall runs prisma generate; schema is not copied yet
RUN npm ci --ignore-scripts

FROM base AS runner
# Railway uses the default (production). Local compose passes development.
ARG APP_MODE=production
ENV APP_MODE=$APP_MODE
ENV NEXT_TELEMETRY_DISABLED=1
# Do NOT set HOSTNAME=0.0.0.0 — Next uses that for redirects and browsers end up on 0.0.0.0.
# Bind address is passed only via `next start -H 0.0.0.0` in entrypoint.
ENV PORT=3000
# Placeholder only so `prisma generate` / `next build` can parse a Postgres URL.
# Runtime DATABASE_URL comes from Compose or Railway.
ENV DATABASE_URL="postgresql://sap:sap@127.0.0.1:5432/sap"
# Next Edge middleware inlines env at build time. Railway injects build args from service variables.
ARG SESSION_SECRET=build-time-placeholder-min-32-chars!!
ENV SESSION_SECRET=$SESSION_SECRET

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate
# Build Next.js in the image so Railway does not time out on first boot.
RUN if [ "$APP_MODE" = "production" ]; then NODE_ENV=production npm run build; fi

COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["/entrypoint.sh"]
