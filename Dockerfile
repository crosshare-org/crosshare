FROM node:10-alpine as builder
RUN apk add --no-cache git build-base g++ cairo-dev \
    jpeg-dev \
    pango-dev \
    freetype-dev \
    giflib-dev
RUN mkdir /src
WORKDIR /src
COPY app/package.json app/yarn.lock ./
RUN yarn --frozen-lockfile
ENV PATH=$PATH:/src/node_modules/.bin NEXT_TELEMETRY_DISABLED=1
COPY . .
WORKDIR /src/app
RUN yarn predeploy
