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
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: { host: 'localhost', port: 8080 },
  });
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

test('security rules should only allow commenting with username if it matches your account', async () => {
  const firestore = testEnv.authenticatedContext('mike').firestore();

  testEnv.withSecurityRulesDisabled(async (ctxt) => {
    const admin = ctxt.firestore();
    await admin.collection('cp').doc('miked').set({ u: 'mike' });
    await admin.collection('cp').doc('rando').set({ u: 'rando' });
  });

  await assertSucceeds(
    firestore.collection('cfm').add({ c: 'comment text', a: 'mike' })
  );
  await assertSucceeds(
    firestore
      .collection('cfm')
      .add({ c: 'comment text', a: 'mike', un: 'miked' })
  );
  await assertSucceeds(
    firestore
      .collection('cfm')
      .add({ c: 'comment text', a: 'mike', un: 'MikeD' })
  );
  await assertFails(
    firestore
      .collection('cfm')
      .add({ c: 'comment text', a: 'mike', un: 'rando' })
  );
  await assertFails(
    firestore
      .collection('cfm')
      .add({ c: 'comment text', a: 'mike', un: 'totalblast' })
  );
});

test('security rules should only allow commenting if non-anonymous', async () => {
  const firestore = testEnv.authenticatedContext('mike', {firebase: {sign_in_provider: 'anonymous'}}).firestore();
  const firestoreNonAnon = testEnv.authenticatedContext('mike', {firebase: {sign_in_provider: 'google.com'}}).firestore();

  await assertFails(
    firestore.collection('cfm').add({ c: 'comment text' })
  );
  await assertFails(
    firestore.collection('cfm').add({ c: 'comment text', a: 'jared' })
  );
  await assertFails(
    firestore.collection('cfm').add({ c: 'comment text', a: 'mike' })
  );
  await assertSucceeds(
    firestoreNonAnon.collection('cfm').add({ c: 'comment text', a: 'mike' })
  );
});