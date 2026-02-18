FROM node:20-slim AS builder
COPY . /src
WORKDIR /src
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    corepack enable pnpm && pnpm install --frozen-lockfile
ENV NODE_ENV=production PATH=$PATH:/app/node_modules/.bin NEXT_TELEMETRY_DISABLED=1
WORKDIR /src/app
RUN pnpm compileI18n
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates libuuid1
RUN pnpm predeploy

FROM gcr.io/distroless/nodejs20-debian12 AS prod
WORKDIR /app
ARG COMMIT
ENV NEXT_PUBLIC_COMMIT_HASH=$COMMIT NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=8080 HOSTNAME="0.0.0.0"
# This is a runtime depency of node canvas
COPY --from=builder /usr/lib/x86_64-linux-gnu/libuuid.so.1 /usr/lib/x86_64-linux-gnu/libuuid.so.1
COPY --from=builder --chown=nonroot:nonroot /src/app/cluedb ./cluedb
COPY --from=builder --chown=nonroot:nonroot /src/app/public ./public
COPY --from=builder --chown=nonroot:nonroot /src/app/nextjs/standalone/app ./
COPY --from=builder --chown=nonroot:nonroot /src/app/nextjs/standalone/node_modules ../node_modules
COPY --from=builder --chown=nonroot:nonroot /src/app/locales ./locales
COPY --from=builder --chown=nonroot:nonroot /src/app/nextjs/static ./nextjs/static

USER nonroot
EXPOSE 8080
CMD ["server.js"]