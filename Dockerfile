FROM node:18-alpine as deps
RUN apk add --no-cache git build-base g++ cairo-dev \
    jpeg-dev \
    pango-dev \
    freetype-dev \
    giflib-dev \
    librsvg-dev \
    linux-headers
RUN mkdir /src
WORKDIR /src
COPY app/package.json app/yarn.lock ./
RUN yarn --frozen-lockfile
ENV PATH=$PATH:/src/node_modules/.bin NEXT_TELEMETRY_DISABLED=1

FROM deps as dev
RUN apk add openjdk11-jre-headless
RUN apk --no-cache add gcompat
ENV LD_PRELOAD=/lib/libgcompat.so.0
RUN npm i -g firebase-tools
RUN firebase --version
RUN firebase setup:emulators:firestore
RUN firebase setup:emulators:storage
RUN firebase setup:emulators:ui
RUN firebase setup:emulators:pubsub

FROM deps as builder
COPY . .
WORKDIR /src/app
RUN yarn compileI18n
RUN yarn predeploy
RUN rm -rf nextjs/cache
WORKDIR /src
RUN yarn install --production --ignore-scripts --prefer-offline
RUN find . -name \*.map -type f -delete

FROM node:18-alpine as prod
RUN apk add cairo pango libjpeg-turbo giflib librsvg
WORKDIR /app
ENV NODE_ENV=production PATH=$PATH:/app/node_modules/.bin NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /src/app/cluedb ./cluedb
COPY --from=builder /src/app/next.config.mjs ./
COPY --from=builder /src/app/public ./public
COPY --from=builder /src/app/locales ./locales
COPY --from=builder /src/node_modules ./node_modules
COPY --from=builder /src/app/nextjs ./nextjs
CMD next start -p $PORT