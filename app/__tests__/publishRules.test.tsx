import { DBPuzzleT } from '../lib/dbtypes';
import * as firebaseTesting from '@firebase/rules-unit-testing';
import { TimestampClass } from '../lib/firebaseWrapper';
import { getMockedPuzzle } from '../lib/testingUtils';

jest.mock('../lib/firebaseWrapper');

const withComments: DBPuzzleT = getMockedPuzzle({}, TimestampClass);

const puzzle = getMockedPuzzle({ cs: [] }, TimestampClass);

test('security rules should not allow publishing with restricted fields set', async () => {
  const app = firebaseTesting.initializeTestApp({
    projectId: 'mdcrosshare',
    auth: {
      uid: 'fSEwJorvqOMK5UhNMHa4mu48izl1',
      firebase: {
        sign_in_provider: 'google.com',
      },
    },
  });

  await firebaseTesting.assertFails(
    app.firestore().collection('c').add(withComments)
  );
  await firebaseTesting.assertFails(
    app.firestore().collection('c').add({ ...puzzle, m: true })
  );
  await firebaseTesting.assertFails(
    app.firestore().collection('c').add({ ...puzzle, c: 'dailymini' })
  );
  await firebaseTesting.assertFails(
    app.firestore().collection('c').add({ ...puzzle, p: null })
  );
  const future = new Date();
  future.setHours(future.getHours() + 1);
  await firebaseTesting.assertFails(
    app.firestore().collection('c').add({ ...puzzle, p: TimestampClass.fromDate(future) })
  );
  await firebaseTesting.assertSucceeds(
    app.firestore().collection('c').add(puzzle)
  );
  await firebaseTesting.assertFails(
    app.firestore().collection('c').add({ ...puzzle, f: true })
  );
  await firebaseTesting.assertFails(
    app.firestore().collection('c').add({ ...puzzle, g: puzzle.g.slice(0, 24) })
  );
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { cs, ...withoutComments } = withComments;
  await firebaseTesting.assertSucceeds(
    app.firestore().collection('c').add(withoutComments)
  );
  await firebaseTesting.assertFails(
    app.firestore().collection('c').add({ ...puzzle, p: null, c: 'dailymini' })
  );
  app.delete();
});

test('security rules should not allow publishing if fake author-id', async () => {
  const app = firebaseTesting.initializeTestApp({
    projectId: 'mdcrosshare',
    auth: {
      uid: 'mike',
      firebase: {
        sign_in_provider: 'google.com',
      },
    },
  });

  await firebaseTesting.assertFails(
    app.firestore().collection('c').add(puzzle)
  );
  app.delete();
});

test('security rules should not allow publishing if anonymous', async () => {
  const app = firebaseTesting.initializeTestApp({
    projectId: 'mdcrosshare',
    auth: {
      uid: 'mike',
      firebase: {
        sign_in_provider: 'anonymous',
      },
    },
  });

  await firebaseTesting.assertFails(
    app.firestore().collection('c').add(puzzle)
  );
  app.delete();
});

test('security rules should not allow publishing if non-user', async () => {
  const app = firebaseTesting.initializeTestApp({
    projectId: 'mdcrosshare'
  });

  await firebaseTesting.assertFails(
    app.firestore().collection('c').add(puzzle)
  );
  app.delete();
});
