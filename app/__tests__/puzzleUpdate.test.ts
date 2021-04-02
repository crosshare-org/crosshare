/**
 * @jest-environment node
 */

import * as firebaseTesting from '@firebase/rules-unit-testing';

import { getMockedPuzzle } from '../lib/getMockedPuzzle';
import { CommentWithRepliesT } from '../lib/dbtypes';
import { AdminTimestamp, setAdminApp } from '../lib/firebaseWrapper';
import {
  getPuzzlesForConstructorPage,
  getPuzzlesForFeatured,
} from '../lib/serverOnly';
import type firebaseAdminType from 'firebase-admin';
import { handlePuzzleUpdate } from '../lib/puzzleUpdate';

jest.mock('../lib/firebaseWrapper');

const toDeleteId = 'puzzletodelete';
const toKeepId = 'puzzletokeep';
const baseTime = new Date('2020-11-10');
const basePuzzle = getMockedPuzzle({
  cs: undefined,
  f: true,
  p: AdminTimestamp.fromDate(baseTime),
});

function getComment(
  fields?: Partial<CommentWithRepliesT>
): CommentWithRepliesT {
  return {
    ...{
      c:
        'A couple of two-worders today which I don\'t love, but I hope you all got it anyway!',
      i: 'LwgoVx0BAskM4wVJyoLj',
      t: 36.009,
      p: AdminTimestamp.fromDate(baseTime),
      a: 'fSEwJorvqOMK5UhNMHa4mu48izl1',
      n: 'Mike D',
      ch: false,
    },
    ...fields,
  };
}

const projectId = 'updatetest';
let adminApp: firebaseAdminType.app.App;
beforeAll(async () => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  adminApp = firebaseTesting.initializeAdminApp({ projectId });
  setAdminApp((adminApp as unknown) as firebaseAdminType.app.App);
});
afterAll(async () =>
  Promise.all(firebaseTesting.apps().map((app) => app.delete()))
);

test('should remove from notifications, plays, indexes and puzzle itself when a puzzle is deleted', async () => {
  await firebaseTesting.clearFirestoreData({ projectId });

  // Create some plays
  const twentyAgo = new Date(baseTime);
  twentyAgo.setMinutes(twentyAgo.getMinutes() - 20);

  const play1 = {
    c: toDeleteId,
    u: 'blah',
    ua: AdminTimestamp.fromDate(twentyAgo),
    g: [],
    ct: [1, 2, 4, 100, 100].concat(new Array(20).fill(100)),
    uc: [5, 2].concat(new Array(23).fill(1)),
    vc: [],
    wc: [],
    we: [],
    rc: [],
    t: 70,
    ch: true,
    f: true,
    n: 'Puzzle title',
  };
  await adminApp.firestore().collection('p').doc('mike-blah').set(play1);

  const play2 = {
    c: toKeepId,
    u: 'anonymous-user-id',
    ua: AdminTimestamp.fromDate(twentyAgo),
    g: [],
    ct: [],
    uc: [],
    vc: [],
    wc: [],
    we: [],
    rc: [],
    t: 44,
    ch: false,
    f: true,
  };
  await adminApp
    .firestore()
    .collection('p')
    .doc('mike-anonymous-user-id')
    .set(play2);

  // create some notifications
  const puzzleWithComments = {
    ...basePuzzle,
    cs: [getComment({ a: 'dummy-author-id' })],
  };
  const puzzleWithComments2 = {
    ...basePuzzle,
    cs: [getComment({ a: 'dummy-author-id', i: 'randomCommentId' })],
  };
  await handlePuzzleUpdate(basePuzzle, puzzleWithComments, toDeleteId);
  await handlePuzzleUpdate(basePuzzle, puzzleWithComments2, toKeepId);

  // create the actual puzzles
  await adminApp
    .firestore()
    .collection('c')
    .doc(toDeleteId)
    .set({ ...puzzleWithComments, del: true });
  await adminApp
    .firestore()
    .collection('c')
    .doc(toKeepId)
    .set(puzzleWithComments);

  // create the indexes
  await getPuzzlesForConstructorPage(puzzleWithComments.a, 0, 5);
  await getPuzzlesForFeatured(0, 5);

  expect(
    await adminApp
      .firestore()
      .collection('n')
      .get()
      .then((r) =>
        r.docs
          .map((d) => d.data())
          .map((d) => {
            delete d['t'];
            return d;
          })
      )
  ).toMatchSnapshot();
  expect(
    await adminApp
      .firestore()
      .collection('p')
      .get()
      .then((r) => r.docs.map((d) => d.data()))
  ).toMatchSnapshot();
  expect(
    await adminApp
      .firestore()
      .collection('c')
      .get()
      .then((r) => r.docs.map((d) => d.data()))
  ).toMatchSnapshot();
  expect(
    await adminApp
      .firestore()
      .collection('i')
      .get()
      .then((r) => r.docs.map((d) => d.data()))
  ).toMatchSnapshot();

  // do the delete
  await handlePuzzleUpdate(
    puzzleWithComments,
    { ...puzzleWithComments, del: true },
    toDeleteId
  );
  await handlePuzzleUpdate(puzzleWithComments2, puzzleWithComments2, toKeepId);

  // and check results
  expect(
    await adminApp
      .firestore()
      .collection('n')
      .get()
      .then((r) =>
        r.docs
          .map((d) => d.data())
          .map((d) => {
            delete d['t'];
            return d;
          })
      )
  ).toMatchSnapshot();
  expect(
    await adminApp
      .firestore()
      .collection('p')
      .get()
      .then((r) => r.docs.map((d) => d.data()))
  ).toMatchSnapshot();
  expect(
    await adminApp
      .firestore()
      .collection('c')
      .get()
      .then((r) => r.docs.map((d) => d.data()))
  ).toMatchSnapshot();
  expect(
    await adminApp
      .firestore()
      .collection('i')
      .get()
      .then((r) => r.docs.map((d) => d.data()))
  ).toMatchSnapshot();
});

test('should remove from notifications and update indexes when a public puzzle is marked private', async () => {
  await firebaseTesting.clearFirestoreData({ projectId });

  // create some notifications
  const puzzleWithComments = {
    ...basePuzzle,
    cs: [getComment({ a: 'dummy-author-id' })],
  };
  const puzzleWithComments2 = {
    ...basePuzzle,
    cs: [getComment({ a: 'dummy-author-id', i: 'randomCommentId' })],
  };
  await handlePuzzleUpdate(basePuzzle, puzzleWithComments, toDeleteId);
  await handlePuzzleUpdate(basePuzzle, puzzleWithComments2, toKeepId);

  // create the actual puzzles
  await adminApp
    .firestore()
    .collection('c')
    .doc(toDeleteId)
    .set(puzzleWithComments);
  await adminApp
    .firestore()
    .collection('c')
    .doc(toKeepId)
    .set(puzzleWithComments2);

  // create the indexes
  await getPuzzlesForConstructorPage(puzzleWithComments.a, 0, 5);
  await getPuzzlesForFeatured(0, 5);

  expect(
    await adminApp
      .firestore()
      .collection('n')
      .get()
      .then((r) =>
        r.docs
          .map((d) => d.data())
          .map((d) => {
            delete d['t'];
            return d;
          })
      )
  ).toMatchSnapshot();
  expect(
    await adminApp
      .firestore()
      .collection('c')
      .get()
      .then((r) => r.docs.map((d) => d.data()))
  ).toMatchSnapshot();
  expect(
    await adminApp
      .firestore()
      .collection('i')
      .get()
      .then((r) => r.docs.map((d) => d.data()))
  ).toMatchSnapshot();

  // mark as private
  await handlePuzzleUpdate(
    puzzleWithComments,
    { ...puzzleWithComments, pv: true },
    toDeleteId
  );
  await handlePuzzleUpdate(puzzleWithComments2, puzzleWithComments2, toKeepId);

  // and check results
  expect(
    await adminApp
      .firestore()
      .collection('n')
      .get()
      .then((r) =>
        r.docs
          .map((d) => d.data())
          .map((d) => {
            delete d['t'];
            return d;
          })
      )
  ).toMatchSnapshot();
  expect(
    await adminApp
      .firestore()
      .collection('c')
      .get()
      .then((r) => r.docs.map((d) => d.data()))
  ).toMatchSnapshot();
  expect(
    await adminApp
      .firestore()
      .collection('i')
      .get()
      .then((r) => r.docs.map((d) => d.data()))
  ).toMatchSnapshot();
});

test('should remove from notifications and update indexes when a public puzzle is marked private until', async () => {
  await firebaseTesting.clearFirestoreData({ projectId });

  // create some notifications
  const puzzleWithComments = {
    ...basePuzzle,
    cs: [getComment({ a: 'dummy-author-id' })],
  };
  const puzzleWithComments2 = {
    ...basePuzzle,
    cs: [getComment({ a: 'dummy-author-id', i: 'randomCommentId' })],
  };
  await handlePuzzleUpdate(basePuzzle, puzzleWithComments, toDeleteId);
  await handlePuzzleUpdate(basePuzzle, puzzleWithComments2, toKeepId);

  // create the actual puzzles
  await adminApp
    .firestore()
    .collection('c')
    .doc(toDeleteId)
    .set(puzzleWithComments);
  await adminApp
    .firestore()
    .collection('c')
    .doc(toKeepId)
    .set(puzzleWithComments2);

  // create the indexes
  await getPuzzlesForConstructorPage(puzzleWithComments.a, 0, 5);
  await getPuzzlesForFeatured(0, 5);

  expect(
    await adminApp
      .firestore()
      .collection('n')
      .get()
      .then((r) =>
        r.docs
          .map((d) => d.data())
          .map((d) => {
            delete d['t'];
            return d;
          })
      )
  ).toMatchSnapshot();
  expect(
    await adminApp
      .firestore()
      .collection('i')
      .get()
      .then((r) => r.docs.map((d) => d.data()))
  ).toMatchSnapshot();

  // mark as private
  await handlePuzzleUpdate(
    puzzleWithComments,
    { ...puzzleWithComments, pvu: AdminTimestamp.fromDate(baseTime) },
    toDeleteId
  );
  await handlePuzzleUpdate(puzzleWithComments2, puzzleWithComments2, toKeepId);

  // and check results
  expect(
    await adminApp
      .firestore()
      .collection('n')
      .get()
      .then((r) =>
        r.docs
          .map((d) => d.data())
          .map((d) => {
            delete d['t'];
            return d;
          })
      )
  ).toMatchSnapshot();
  expect(
    await adminApp
      .firestore()
      .collection('i')
      .get()
      .then((r) => r.docs.map((d) => d.data()))
  ).toMatchSnapshot();
});

test('should update indexes when a private puzzle is marked public', async () => {
  await firebaseTesting.clearFirestoreData({ projectId });

  // create some notifications
  const puzzleWithComments = {
    ...basePuzzle,
    cs: [getComment({ a: 'dummy-author-id' })],
  };
  const puzzleWithComments2 = {
    ...basePuzzle,
    cs: [getComment({ a: 'dummy-author-id', i: 'randomCommentId' })],
  };
  await handlePuzzleUpdate(basePuzzle, puzzleWithComments, toDeleteId);
  await handlePuzzleUpdate(basePuzzle, puzzleWithComments2, toKeepId);

  // create the actual puzzles
  await adminApp
    .firestore()
    .collection('c')
    .doc(toDeleteId)
    .set({ ...puzzleWithComments, pv: true });
  await adminApp
    .firestore()
    .collection('c')
    .doc(toKeepId)
    .set({ ...puzzleWithComments2, pv: true });

  // create the indexes
  await getPuzzlesForConstructorPage(puzzleWithComments.a, 0, 5);
  await getPuzzlesForFeatured(0, 5);

  expect(
    await adminApp
      .firestore()
      .collection('n')
      .get()
      .then((r) =>
        r.docs
          .map((d) => d.data())
          .map((d) => {
            delete d['t'];
            return d;
          })
      )
  ).toMatchSnapshot();
  expect(
    await adminApp
      .firestore()
      .collection('i')
      .get()
      .then((r) => r.docs.map((d) => d.data()))
  ).toMatchSnapshot();

  // mark as public
  await handlePuzzleUpdate(
    { ...puzzleWithComments, pv: true },
    puzzleWithComments,
    toDeleteId
  );
  await handlePuzzleUpdate(
    { ...puzzleWithComments2, pv: true },
    { ...puzzleWithComments2, pv: true },
    toKeepId
  );

  // and check results
  expect(
    await adminApp
      .firestore()
      .collection('n')
      .get()
      .then((r) =>
        r.docs
          .map((d) => d.data())
          .map((d) => {
            delete d['t'];
            return d;
          })
      )
  ).toMatchSnapshot();
  expect(
    await adminApp
      .firestore()
      .collection('i')
      .get()
      .then((r) => r.docs.map((d) => d.data()))
  ).toMatchSnapshot();
});

test('should update indexes when a private until puzzle is marked public', async () => {
  await firebaseTesting.clearFirestoreData({ projectId });

  // create some notifications
  const puzzleWithComments = {
    ...basePuzzle,
    pvu: AdminTimestamp.fromDate(baseTime),
    cs: [getComment({ a: 'dummy-author-id' })],
  };
  const puzzleWithComments2 = {
    ...basePuzzle,
    pvu: AdminTimestamp.fromDate(baseTime),
    cs: [getComment({ a: 'dummy-author-id', i: 'randomCommentId' })],
  };
  await handlePuzzleUpdate(basePuzzle, puzzleWithComments, toDeleteId);
  await handlePuzzleUpdate(basePuzzle, puzzleWithComments2, toKeepId);

  // create the actual puzzles
  await adminApp
    .firestore()
    .collection('c')
    .doc(toDeleteId)
    .set(puzzleWithComments);
  await adminApp
    .firestore()
    .collection('c')
    .doc(toKeepId)
    .set(puzzleWithComments2);

  // create the indexes
  await getPuzzlesForConstructorPage(puzzleWithComments.a, 0, 5);
  await getPuzzlesForFeatured(0, 5);

  expect(
    await adminApp
      .firestore()
      .collection('n')
      .get()
      .then((r) =>
        r.docs
          .map((d) => d.data())
          .map((d) => {
            delete d['t'];
            return d;
          })
      )
  ).toMatchSnapshot();
  expect(
    await adminApp
      .firestore()
      .collection('i')
      .get()
      .then((r) => r.docs.map((d) => d.data()))
  ).toMatchSnapshot();

  // mark as public
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { pvu, ...updated } = puzzleWithComments;
  await handlePuzzleUpdate(puzzleWithComments, updated, toDeleteId);
  await handlePuzzleUpdate(puzzleWithComments2, puzzleWithComments2, toKeepId);

  // and check results
  expect(
    await adminApp
      .firestore()
      .collection('n')
      .get()
      .then((r) =>
        r.docs
          .map((d) => d.data())
          .map((d) => {
            delete d['t'];
            return d;
          })
      )
  ).toMatchSnapshot();
  expect(
    await adminApp
      .firestore()
      .collection('i')
      .get()
      .then((r) => r.docs.map((d) => d.data()))
  ).toMatchSnapshot();
});

test('should update indexes when a private puzzle is marked private until', async () => {
  await firebaseTesting.clearFirestoreData({ projectId });

  // create some notifications
  const puzzleWithComments = {
    ...basePuzzle,
    pv: true,
    cs: [getComment({ a: 'dummy-author-id' })],
  };
  const puzzleWithComments2 = {
    ...basePuzzle,
    pv: true,
    cs: [getComment({ a: 'dummy-author-id', i: 'randomCommentId' })],
  };
  await handlePuzzleUpdate(basePuzzle, puzzleWithComments, toDeleteId);
  await handlePuzzleUpdate(basePuzzle, puzzleWithComments2, toKeepId);

  // create the actual puzzles
  await adminApp
    .firestore()
    .collection('c')
    .doc(toDeleteId)
    .set(puzzleWithComments);
  await adminApp
    .firestore()
    .collection('c')
    .doc(toKeepId)
    .set(puzzleWithComments2);

  // create the indexes
  await getPuzzlesForConstructorPage(puzzleWithComments.a, 0, 5);
  await getPuzzlesForFeatured(0, 5);

  expect(
    await adminApp
      .firestore()
      .collection('n')
      .get()
      .then((r) =>
        r.docs
          .map((d) => d.data())
          .map((d) => {
            delete d['t'];
            return d;
          })
      )
  ).toMatchSnapshot();
  expect(
    await adminApp
      .firestore()
      .collection('i')
      .get()
      .then((r) => r.docs.map((d) => d.data()))
  ).toMatchSnapshot();

  // mark as privateuntil
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const updated = {
    ...puzzleWithComments,
    pv: false,
    pvu: AdminTimestamp.fromDate(baseTime),
  };
  await handlePuzzleUpdate(puzzleWithComments, updated, toDeleteId);
  await handlePuzzleUpdate(puzzleWithComments2, puzzleWithComments2, toKeepId);

  // and check results
  expect(
    await adminApp
      .firestore()
      .collection('n')
      .get()
      .then((r) =>
        r.docs
          .map((d) => d.data())
          .map((d) => {
            delete d['t'];
            return d;
          })
      )
  ).toMatchSnapshot();
  expect(
    await adminApp
      .firestore()
      .collection('i')
      .get()
      .then((r) => r.docs.map((d) => d.data()))
  ).toMatchSnapshot();
});

test('should update indexes when a private until puzzle is marked private', async () => {
  await firebaseTesting.clearFirestoreData({ projectId });

  // create some notifications
  const puzzleWithComments = {
    ...basePuzzle,
    pvu: AdminTimestamp.fromDate(baseTime),
    cs: [getComment({ a: 'dummy-author-id' })],
  };
  const puzzleWithComments2 = {
    ...basePuzzle,
    pvu: AdminTimestamp.fromDate(baseTime),
    cs: [getComment({ a: 'dummy-author-id', i: 'randomCommentId' })],
  };
  await handlePuzzleUpdate(basePuzzle, puzzleWithComments, toDeleteId);
  await handlePuzzleUpdate(basePuzzle, puzzleWithComments2, toKeepId);

  // create the actual puzzles
  await adminApp
    .firestore()
    .collection('c')
    .doc(toDeleteId)
    .set(puzzleWithComments);
  await adminApp
    .firestore()
    .collection('c')
    .doc(toKeepId)
    .set(puzzleWithComments2);

  // create the indexes
  await getPuzzlesForConstructorPage(puzzleWithComments.a, 0, 5);
  await getPuzzlesForFeatured(0, 5);

  expect(
    await adminApp
      .firestore()
      .collection('n')
      .get()
      .then((r) =>
        r.docs
          .map((d) => d.data())
          .map((d) => {
            delete d['t'];
            return d;
          })
      )
  ).toMatchSnapshot();
  expect(
    await adminApp
      .firestore()
      .collection('i')
      .get()
      .then((r) => r.docs.map((d) => d.data()))
  ).toMatchSnapshot();

  // mark as private
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const updated = {
    ...puzzleWithComments,
    pv: true,
    pvu: undefined,
  };
  await handlePuzzleUpdate(puzzleWithComments, updated, toDeleteId);
  await handlePuzzleUpdate(puzzleWithComments2, puzzleWithComments2, toKeepId);

  // and check results
  expect(
    await adminApp
      .firestore()
      .collection('n')
      .get()
      .then((r) =>
        r.docs
          .map((d) => d.data())
          .map((d) => {
            delete d['t'];
            return d;
          })
      )
  ).toMatchSnapshot();
  expect(
    await adminApp
      .firestore()
      .collection('i')
      .get()
      .then((r) => r.docs.map((d) => d.data()))
  ).toMatchSnapshot();
});
