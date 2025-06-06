FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
RUN npm install -g corepack@latest

FROM base AS builder
COPY . /usr/src
WORKDIR /usr/src
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
ENV PATH=$PATH:/src/node_modules/.bin NEXT_TELEMETRY_DISABLED=1
WORKDIR /usr/src/app
RUN pnpm compileI18n
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates libuuid1
RUN pnpm predeploy
RUN pnpm deploy --legacy --filter=web --prod /prod
ARG COMMIT
RUN test -n "$COMMIT"

FROM gcr.io/distroless/nodejs20-debian12 AS prod
ARG COMMIT
ENV NEXT_PUBLIC_COMMIT_HASH=$COMMIT NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
# This is a runtime depency of node canvas
COPY --from=builder /usr/lib/x86_64-linux-gnu/libuuid.so.1 /usr/lib/x86_64-linux-gnu/libuuid.so.1
WORKDIR /app
COPY --from=builder /prod/cluedb ./cluedb
COPY --from=builder /prod/public ./public
COPY --from=builder /prod/next.config.mjs ./
COPY --from=builder /prod/node_modules ./node_modules
COPY --from=builder /prod/locales ./locales
COPY --from=builder /prod/nextjs ./nextjs

CMD ["./node_modules/next/dist/bin/next", "start", "-p", "8080"]