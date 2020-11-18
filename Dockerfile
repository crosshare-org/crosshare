FROM node:lts-alpine as emulators

RUN apk add openjdk11-jre-headless
RUN npm i -g firebase-tools
RUN firebase --version
RUN firebase setup:emulators:firestore
RUN mkdir /src
ADD app/firebase.json /src
ADD app/firestore.rules /src
ADD app/.firebaserc /src
WORKDIR /src
EXPOSE  8080
CMD ["firebase", "emulators:start", "--only", "firestore"]