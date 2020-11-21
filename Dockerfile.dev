FROM node:10-alpine as emulators
RUN apk add openjdk11-jre-headless
RUN npm i -g firebase-tools
RUN firebase --version
RUN firebase setup:emulators:firestore
RUN mkdir /src
ADD app/firebase.json /src
ADD app/firestore.rules /src
WORKDIR /src
EXPOSE  8080
CMD ["firebase", "emulators:start", "--only", "firestore"]

FROM node:10-alpine as base
RUN apk add --no-cache git build-base g++ cairo-dev \
    jpeg-dev \
    pango-dev \
    freetype-dev \
    giflib-dev
RUN mkdir /src
WORKDIR /src
COPY app/package.json app/yarn.lock ./
RUN yarn --frozen-lockfile
WORKDIR /src/app
ENV PATH=$PATH:/src/node_modules/.bin NEXT_TELEMETRY_DISABLED=1
FROM base as vscode
RUN mkdir /src/vscode

FROM base as jest
ENV NEXT_PUBLIC_USE_FIREBASE_EMULATOR=1 FIRESTORE_EMULATOR_HOST=emulators:8080