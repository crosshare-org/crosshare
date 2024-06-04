/**
 * @jest-environment node
 */

import {
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { DBPuzzleT } from '../lib/dbtypes.js';
import { convertTimestamps } from '../lib/firebaseWrapper.js';
import { getMockedPuzzle } from '../lib/getMockedPuzzle.js';

const packPuzzleId = 'foobar';
const unpackPuzzleId = 'foobarbaz';
const puzzle: DBPuzzleT = convertTimestamps(
  getMockedPuzzle({ cs: [], pk: 'irving' })
) as DBPuzzleT;
const unpacked: DBPuzzleT = convertTimestamps(
  getMockedPuzzle({ cs: [] })
) as DBPuzzleT;

const projectId = 'demo-pack-rules-testing';
let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: { host: 'localhost', port: 8080 },
  });

  await testEnv.withSecurityRulesDisabled(async (ctxt) => {
    const firestore = ctxt.firestore();
    await firestore.collection('c').doc(packPuzzleId).set(puzzle);
    await firestore.collection('c').doc(unpackPuzzleId).set(unpacked);
    await firestore
      .collection('prefs')
      .doc('buyer')
      .set({ packs: ['irving'] });
    await firestore
      .collection('packs')
      .doc('irving')
      .set({ a: ['packowner'] });
  });
});

test('constructor can get pack puzzle', async () => {
  const firestore = testEnv
    .authenticatedContext('fSEwJorvqOMK5UhNMHa4mu48izl1')
    .firestore();

  await assertSucceeds(getDoc(doc(collection(firestore, 'c'), packPuzzleId)));
});

test('rando cannot get pack puzzle', async () => {
  const firestore = testEnv.authenticatedContext('rando').firestore();

  await assertSucceeds(getDoc(doc(collection(firestore, 'c'), unpackPuzzleId)));
  await assertFails(getDoc(doc(collection(firestore, 'c'), packPuzzleId)));
});

test('buyer can get pack puzzle', async () => {
  const firestore = testEnv.authenticatedContext('buyer').firestore();

  await assertSucceeds(getDoc(doc(collection(firestore, 'c'), packPuzzleId)));
});

test('pack owner can get pack puzzle', async () => {
  const firestore = testEnv.authenticatedContext('packowner').firestore();

  await assertSucceeds(getDoc(doc(collection(firestore, 'c'), packPuzzleId)));
});

test('cannot list puzzles', async () => {
  const firestore = testEnv.authenticatedContext('packowner').firestore();

  await assertFails(getDocs(query(collection(firestore, 'c'), limit(2))));
});

test('pack owner can list pack puzzles (for review)', async () => {
  const firestore = testEnv.authenticatedContext('packowner').firestore();

  await assertSucceeds(
    getDocs(query(collection(firestore, 'c'), where('pk', '==', 'irving')))
  );
});

test('rando cannot list pack puzzles', async () => {
  const firestore = testEnv.authenticatedContext('rando').firestore();

  await assertFails(
    getDocs(query(collection(firestore, 'c'), where('pk', '==', 'irving')))
  );
});

test('user can create prefs doc', async () => {
  const firestore = testEnv.authenticatedContext('rando').firestore();

  await assertSucceeds(
    setDoc(doc(collection(firestore, 'prefs'), 'rando'), { foo: ['bar'] })
  );
});

test('user cannot create prefs doc with pack', async () => {
  const firestore = testEnv.authenticatedContext('rando').firestore();

  await assertFails(
    setDoc(doc(collection(firestore, 'prefs'), 'rando'), { packs: ['bar'] })
  );
});

test('user can update prefs doc', async () => {
  const firestore = testEnv.authenticatedContext('rando').firestore();

  await assertSucceeds(
    setDoc(doc(collection(firestore, 'prefs'), 'rando'), { foo: ['bar'] })
  );
  await assertSucceeds(
    updateDoc(doc(collection(firestore, 'prefs'), 'rando'), { bam: ['baz'] })
  );
  const res = await getDoc(doc(collection(firestore, 'prefs'), 'rando'));
  expect(res.data()).toMatchInlineSnapshot(`
    {
      "bam": [
        "baz",
      ],
      "foo": [
        "bar",
      ],
    }
  `);
});

test('user cannot update prefs doc with pack', async () => {
  const firestore = testEnv.authenticatedContext('rando').firestore();

  await assertSucceeds(
    setDoc(doc(collection(firestore, 'prefs'), 'rando'), { foo: ['bar'] })
  );
  await assertFails(
    updateDoc(doc(collection(firestore, 'prefs'), 'rando'), { packs: ['baz'] })
  );
  const res = await getDoc(doc(collection(firestore, 'prefs'), 'rando'));
  expect(res.data()).toMatchInlineSnapshot(`
    {
      "foo": [
        "bar",
      ],
    }
  `);
});
