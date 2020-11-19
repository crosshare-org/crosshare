FROM node:10 as emulators
RUN npm i -g firebase-tools
RUN firebase --version
RUN firebase setup:emulators:firestore
RUN mkdir /src
ADD app/firebase.json /src
ADD app/firestore.rules /src
WORKDIR /src
EXPOSE  8080
CMD ["firebase", "emulators:start", "--only", "firestore"]

FROM node:10 as base
RUN mkdir /src
WORKDIR /src
COPY app/package.json app/yarn.lock ./
RUN yarn --frozen-lockfile
COPY . .
ENV NEXT_PUBLIC_USE_FIREBASE_EMULATOR=1 FIRESTORE_EMULATOR_HOST=localhost:8080