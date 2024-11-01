FROM mcr.microsoft.com/playwright:v1.44.1-jammy as dev
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
RUN mkdir /src
WORKDIR /src
COPY app/package.json app/pnpm-lock.yaml app/lingui.config.ts ./
RUN apt-get update && apt-get install -y --no-install-recommends openjdk-11-jre-headless curl build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
RUN corepack use pnpm
RUN pnpm i --frozen-lockfile
ENV PATH=$PATH:/src/node_modules/.bin NEXT_TELEMETRY_DISABLED=1
RUN pnpm compileI18n
RUN npm i -g firebase-tools
RUN firebase --version
RUN firebase setup:emulators:firestore
RUN firebase setup:emulators:storage
RUN firebase setup:emulators:ui
RUN firebase setup:emulators:pubsub
ARG COMMIT=dev
ENV NEXT_PUBLIC_COMMIT_HASH $COMMIT

FROM node:20-slim as builder
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
RUN mkdir /src
WORKDIR /src
COPY app/package.json app/pnpm-lock.yaml ./
RUN pnpm i --frozen-lockfile
ENV PATH=$PATH:/src/node_modules/.bin NEXT_TELEMETRY_DISABLED=1
COPY . .
WORKDIR /src/app
RUN pnpm compileI18n
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates libuuid1
RUN pnpm predeploy
RUN rm -rf nextjs/cache
WORKDIR /src
RUN pnpm i --prod --ignore-scripts --offline --frozen-lockfile
ARG COMMIT
RUN test -n "$COMMIT"

FROM gcr.io/distroless/nodejs20-debian12 as prod
ARG COMMIT
ENV NEXT_PUBLIC_COMMIT_HASH=$COMMIT NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
COPY --from=builder /src/app/cluedb ./cluedb
COPY --from=builder /src/app/next.config.mjs ./
COPY --from=builder /src/app/public ./public
COPY --from=builder /src/app/locales ./locales
COPY --from=builder /src/node_modules ./node_modules
COPY --from=builder /src/app/nextjs ./nextjs

# This is a runtime depency of node canvas
COPY --from=builder /usr/lib/x86_64-linux-gnu/libuuid.so.1 /usr/lib/x86_64-linux-gnu/libuuid.so.1

CMD ["./node_modules/next/dist/bin/next", "start", "-p", "8080"]