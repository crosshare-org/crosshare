FROM mcr.microsoft.com/playwright:v1.32.2-jammy as dev
RUN mkdir /src
WORKDIR /src
COPY app/package.json app/yarn.lock ./
RUN yarn --frozen-lockfile
ENV PATH=$PATH:/src/node_modules/.bin NEXT_TELEMETRY_DISABLED=1
RUN apt-get update && apt-get install -y --no-install-recommends openjdk-11-jre-headless curl
RUN npm i -g firebase-tools
RUN firebase --version
RUN firebase setup:emulators:firestore
RUN firebase setup:emulators:storage
RUN firebase setup:emulators:ui
RUN firebase setup:emulators:pubsub

FROM node:18-slim as builder
RUN mkdir /src
WORKDIR /src
COPY app/package.json app/yarn.lock ./
RUN yarn --frozen-lockfile
ENV PATH=$PATH:/src/node_modules/.bin NEXT_TELEMETRY_DISABLED=1
COPY . .
WORKDIR /src/app
RUN yarn compileI18n
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates libuuid1
RUN yarn predeploy
RUN rm -rf nextjs/cache
WORKDIR /src
RUN yarn install --production --ignore-scripts --prefer-offline

FROM gcr.io/distroless/nodejs18-debian11 as prod
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /src/app/cluedb ./cluedb
COPY --from=builder /src/app/next.config.mjs ./
COPY --from=builder /src/app/public ./public
COPY --from=builder /src/app/locales ./locales
COPY --from=builder /src/node_modules ./node_modules
COPY --from=builder /src/app/nextjs ./nextjs

# This is a runtime depency of node canvas
COPY --from=builder /usr/lib/x86_64-linux-gnu/libuuid.so.1 /usr/lib/x86_64-linux-gnu/libuuid.so.1

CMD ["./node_modules/next/dist/bin/next", "start", "-p", "8080"]