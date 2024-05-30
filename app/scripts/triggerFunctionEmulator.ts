#!/usr/bin/env -S npx tsx

import { PubSub } from '@google-cloud/pubsub';

const pubsubClient = new PubSub({
  projectId: 'demo-crosshare',
  apiEndpoint: 'localhost:8085',
  emulatorMode: true,
  port: 8085,
});

const functionName = 'autoModerator';
const topic = `firebase-schedule-${functionName}`;

const publisher = pubsubClient.topic(topic);

publisher
  .publishMessage({
    json: {},
  })
  .then(() => {
    console.log('published');
  })
  .catch((e: unknown) => {
    console.error(e);
  });
