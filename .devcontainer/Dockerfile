FROM mcr.microsoft.com/playwright:v1.58.2-noble AS dev
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
RUN apt-get update && apt-get install -y --no-install-recommends openjdk-21-jre-headless curl build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
RUN npm cache clean -f
RUN npm install -g n
RUN n 20 # node version 20
RUN npm install -g corepack@latest
RUN corepack use pnpm@latest-10
RUN pnpm install -g firebase-tools@v15.1.0
RUN firebase --version
RUN firebase setup:emulators:firestore
RUN firebase setup:emulators:storage
RUN firebase setup:emulators:ui
RUN firebase setup:emulators:pubsub
RUN apt-get install -y --no-install-recommends tmux
ENV NEXT_PUBLIC_COMMIT_HASH=dev