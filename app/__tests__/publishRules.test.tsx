import { DBPuzzleT } from '../lib/dbtypes';
import * as firebaseTesting from '@firebase/testing';
import { TimestampClass } from '../lib/firebaseWrapper';

jest.mock('../lib/firebaseWrapper');

const withComments: DBPuzzleT = {
  c: null,
  m: false,
  t: 'Raises, as young',
  dn: [1, 2, 3, 4, 5],
  ac:
    [' Cobbler\'s forms',
      'Absolutely perfect',
      'Spike Lee\'s "She\'s ___ Have It"',
      'English class assignment',
      'Raises, as young'],
  dc:
    ['Hybrid whose father is a lion',
      '___ of reality (wake-up call)',
      '___ date (makes wedding plans)',
      'Middle Ages invader',
      'Has a great night at the comedy club'],
  p: TimestampClass.now(),
  a: 'fSEwJorvqOMK5UhNMHa4mu48izl1',
  ca: TimestampClass.now(),
  an: [1, 6, 7, 8, 9],
  g:
    ['L',
      'A',
      'S',
      'T',
      'S',
      'I',
      'D',
      'E',
      'A',
      'L',
      'G',
      'O',
      'T',
      'T',
      'A',
      'E',
      'S',
      'S',
      'A',
      'Y',
      'R',
      'E',
      'A',
      'R',
      'S'],
  h: 5,
  w: 5,
  cs:
    [{
      c:
        'A couple of two-worders today which I don\'t love, but I hope you all got it anyway!',
      i: 'LwgoVx0BAskM4wVJyoLj',
      t: 36.009,
      p: TimestampClass.now(),
      a: 'fSEwJorvqOMK5UhNMHa4mu48izl1',
      n: 'Mike D',
      ch: false,
    }],
  n: 'Mike D'
};

const puzzle = { ...withComments, cs: [] };

test('security rules should not allow publishing with restricted fields set', async () => {
  const app = firebaseTesting.initializeTestApp({
    projectId: 'mdcrosshare',
    auth: {
      uid: 'fSEwJorvqOMK5UhNMHa4mu48izl1',
      admin: false,
      firebase: {
        sign_in_provider: 'google',
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { cs, ...withoutComments } = withComments;
  await firebaseTesting.assertSucceeds(
    app.firestore().collection('c').add(withoutComments)
  );
  await firebaseTesting.assertSucceeds(
    app.firestore().collection('c').add({ ...puzzle, p: null, c: 'dailymini' })
  );
  app.delete();
});

test('security rules should not allow publishing if fake author-id', async () => {
  const app = firebaseTesting.initializeTestApp({
    projectId: 'mdcrosshare',
    auth: {
      uid: 'mike',
      admin: false,
      firebase: {
        sign_in_provider: 'google',
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
      admin: false,
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
