/**
 * @jest-environment node
 */

import {
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { Timestamp, addDoc, collection } from 'firebase/firestore';
import { DBPuzzleT } from '../lib/dbtypes.js';
import { convertTimestamps } from '../lib/firebaseWrapper.js';
import { getMockedPuzzle } from '../lib/getMockedPuzzle.js';

const withComments: DBPuzzleT = convertTimestamps(
  getMockedPuzzle({})
) as DBPuzzleT;

const puzzle: DBPuzzleT = convertTimestamps(
  getMockedPuzzle({ cs: [] })
) as DBPuzzleT;

const projectId = 'demo-publish-testing';
let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: { host: 'localhost', port: 8080 },
  });
});

test('security rules should allow publishing if correct', async () => {
  const firestore = testEnv
    .authenticatedContext('fSEwJorvqOMK5UhNMHa4mu48izl1')
    .firestore();

  await assertSucceeds(addDoc(collection(firestore, 'c'), puzzle));
});

test('security rules should not allow publishing with restricted fields set', async () => {
  const firestore = testEnv
    .authenticatedContext('fSEwJorvqOMK5UhNMHa4mu48izl1')
    .firestore();

  await assertFails(addDoc(collection(firestore, 'c'), withComments));
  await assertFails(addDoc(collection(firestore, 'c'), { ...puzzle, m: true }));
  await assertFails(
    addDoc(collection(firestore, 'c'), { ...puzzle, c: 'dailymini' })
  );
  await assertFails(addDoc(collection(firestore, 'c'), { ...puzzle, p: null }));
  const future = new Date();
  future.setHours(future.getHours() + 1);
  await assertFails(
    addDoc(collection(firestore, 'c'), {
      ...puzzle,
      p: Timestamp.fromDate(future),
    })
  );
  await assertFails(addDoc(collection(firestore, 'c'), { ...puzzle, f: true }));
  await assertFails(
    addDoc(collection(firestore, 'c'), { ...puzzle, g: puzzle.g.slice(0, 24) })
  );

  const newGrid = [...puzzle.g];
  newGrid[0] = '.';
  await assertSucceeds(
    addDoc(collection(firestore, 'c'), { ...puzzle, g: newGrid })
  );
  newGrid[0] = 'Ñ';
  await assertSucceeds(
    addDoc(collection(firestore, 'c'), { ...puzzle, g: newGrid })
  );
  newGrid[0] = '?';
  await assertFails(
    addDoc(collection(firestore, 'c'), { ...puzzle, g: newGrid })
  );

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { cs, ...withoutComments } = withComments;
  await assertSucceeds(addDoc(collection(firestore, 'c'), withoutComments));
  await assertFails(
    addDoc(collection(firestore, 'c'), { ...puzzle, p: null, c: 'dailymini' })
  );
});

test('security rules should not allow publishing if fake author-id', async () => {
  const firestore = testEnv.authenticatedContext('mike').firestore();

  await assertFails(addDoc(collection(firestore, 'c'), puzzle));
});

test('security rules should not allow publishing if anonymous', async () => {
  const firestore = testEnv
    .authenticatedContext('mike', {
      firebase: { sign_in_provider: 'anonymous' },
    })
    .firestore();

  await assertFails(addDoc(collection(firestore, 'c'), puzzle));
});

test('security rules should not allow publishing if non-user', async () => {
  const firestore = testEnv.unauthenticatedContext().firestore();

  await assertFails(addDoc(collection(firestore, 'c'), puzzle));
});
