FROM mcr.microsoft.com/playwright:v1.44.1-jammy AS dev
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
RUN apt-get update && apt-get install -y --no-install-recommends openjdk-11-jre-headless curl build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
RUN corepack use pnpm
RUN pnpm install -g firebase-tools
RUN firebase --version
RUN firebase setup:emulators:firestore
RUN firebase setup:emulators:storage
RUN firebase setup:emulators:ui
RUN firebase setup:emulators:pubsub
ENV NEXT_PUBLIC_COMMIT_HASH=dev