/**
 * @jest-environment node
 */

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { addDoc, collection } from 'firebase/firestore';

const projectId = 'demo-comments-testing';
let testEnv: RulesTestEnvironment;


beforeAll(async () => {
  testEnv = await initializeTestEnvironment({projectId, firestore: {host: 'localhost', port: 8080}});
});

test('security rules should only allow commenting as onesself', async () => {
  const firestore = testEnv.authenticatedContext('mike').firestore();

  await assertFails(
    addDoc(collection(firestore, 'cfm'), { c: 'comment text' })
  );
  await assertFails(
    addDoc(collection(firestore, 'cfm'), { c: 'comment text', a: 'jared' })
  );
  await assertSucceeds(
    addDoc(collection(firestore, 'cfm'), { c: 'comment text', a: 'mike' })
  );
});
/*
test('security rules should only allow commenting with username if it matches your account', async () => {
  await adminApp.firestore().collection('cp').doc('miked').set({ u: 'mike' });
  await adminApp.firestore().collection('cp').doc('rando').set({ u: 'rando' });

  const app = firebaseTesting.initializeTestApp({
    projectId,
    auth: {
      uid: 'mike',
      firebase: {
        sign_in_provider: 'google.com',
      },
    },
  });

  await firebaseTesting.assertSucceeds(
    app.firestore().collection('cfm').add({ c: 'comment text', a: 'mike' })
  );
  await firebaseTesting.assertSucceeds(
    app
      .firestore()
      .collection('cfm')
      .add({ c: 'comment text', a: 'mike', un: 'miked' })
  );
  await firebaseTesting.assertSucceeds(
    app
      .firestore()
      .collection('cfm')
      .add({ c: 'comment text', a: 'mike', un: 'MikeD' })
  );
  await firebaseTesting.assertFails(
    app
      .firestore()
      .collection('cfm')
      .add({ c: 'comment text', a: 'mike', un: 'rando' })
  );
  await firebaseTesting.assertFails(
    app
      .firestore()
      .collection('cfm')
      .add({ c: 'comment text', a: 'mike', un: 'totalblast' })
  );
});

test('security rules should only allow commenting if non-anonymous', async () => {
  const app = firebaseTesting.initializeTestApp({
    projectId,
    auth: {
      uid: 'mike',
      firebase: {
        sign_in_provider: 'anonymous',
      },
    },
  });

  await firebaseTesting.assertFails(
    app.firestore().collection('cfm').add({ c: 'comment text' })
  );
  await firebaseTesting.assertFails(
    app.firestore().collection('cfm').add({ c: 'comment text', a: 'jared' })
  );
  await firebaseTesting.assertFails(
    app.firestore().collection('cfm').add({ c: 'comment text', a: 'mike' })
  );
});
*/