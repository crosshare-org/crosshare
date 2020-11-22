FROM node:10-alpine as builder
RUN apk add --no-cache git build-base g++ cairo-dev \
    jpeg-dev \
    pango-dev \
    freetype-dev \
    giflib-dev \
    librsvg-dev
RUN mkdir /src
WORKDIR /src
COPY app/package.json app/yarn.lock ./
RUN yarn --frozen-lockfile
ENV PATH=$PATH:/src/node_modules/.bin NEXT_TELEMETRY_DISABLED=1
COPY . .
WORKDIR /src/app
RUN yarn predeploy
RUN rm -rf nextjs/cache
WORKDIR /src
RUN yarn install --production --ignore-scripts --prefer-offline

FROM node:10-alpine as prod
RUN apk add cairo pango libjpeg-turbo giflib librsvg
WORKDIR /app
ENV NODE_ENV=production PATH=$PATH:/app/node_modules/.bin NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /src/app/next.config.js ./
COPY --from=builder /src/app/public ./public
COPY --from=builder /src/app/nextjs ./nextjs
COPY --from=builder /src/node_modules ./node_modules
CMD ["next", "start"]