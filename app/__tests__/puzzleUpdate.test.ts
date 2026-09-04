/**
 * @jest-environment node
 */

import {
  RulesTestEnvironment,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { CommentWithRepliesT, DBPuzzleT } from '../lib/dbtypes.js';
import {
  overrideFirestore,
  overrideToFirestore,
} from '../lib/firebaseAdminWrapper.js';
import { convertTimestamps, converter } from '../lib/firebaseWrapper.js';
import { getMockedPuzzle } from '../lib/getMockedPuzzle.js';
import { newPuzzleNotification } from '../lib/notificationTypes.js';
import { handlePuzzleUpdate } from '../lib/puzzleUpdate.js';
import { Timestamp } from '../lib/timestamp.js';

const toDeleteId = 'puzzletodelete';
const toKeepId = 'puzzletokeep';
const baseTime = new Date(Date.UTC(2020, 10, 10));
const baseTime2 = new Date(Date.UTC(2020, 11, 11));
const basePuzzle = getMockedPuzzle({
  cs: undefined,
  f: true,
  p: Timestamp.fromDate(baseTime),
  pvu: Timestamp.fromDate(baseTime),
});

function getComment(
  fields?: Partial<CommentWithRepliesT>
): CommentWithRepliesT {
  return {
    ...{
      c: "A couple of two-worders today which I don't love, but I hope you all got it anyway!",
      i: 'LwgoVx0BAskM4wVJyoLj',
      t: 36.009,
      p: Timestamp.fromDate(baseTime),
      a: 'fSEwJorvqOMK5UhNMHa4mu48izl1',
      n: 'Mike D',
      ch: false,
    },
    ...fields,
  };
}

const projectId = 'updatetest';
let testEnv: RulesTestEnvironment;
beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: { host: '127.0.0.1', port: 8080 },
  });
});
afterAll(async () => {
  await testEnv.cleanup();
});

test('should remove from notifications, plays and puzzle itself when a puzzle is deleted', async () => {
  await testEnv.clearFirestore();

  await testEnv.withSecurityRulesDisabled(async (adminApp) => {
    const firestore = adminApp.firestore();
    overrideFirestore(firestore as unknown as FirebaseFirestore.Firestore);
    overrideToFirestore(convertTimestamps);

    // Create some plays
    const twentyAgo = new Date(baseTime);
    twentyAgo.setMinutes(twentyAgo.getMinutes() - 20);

    const play1 = {
      c: toDeleteId,
      u: 'blah',
      ua: Timestamp.fromDate(twentyAgo),
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

    await firestore
      .collection('p')
      .withConverter(converter)
      .doc('mike-blah')
      .set(play1);

    const play2 = {
      c: toKeepId,
      u: 'anonymous-user-id',
      ua: Timestamp.fromDate(twentyAgo),
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
    await firestore
      .collection('p')
      .withConverter(converter)
      .doc('mike-anonymous-user-id')
      .set(play2);

    const puzzleWithComments = {
      ...basePuzzle,
      cs: [getComment({ a: 'dummy-author-id' })],
    };
    const puzzleWithComments2 = {
      ...basePuzzle,
      cs: [getComment({ a: 'dummy-author-id', i: 'randomCommentId' })],
    };

    // create the actual puzzles
    await firestore
      .collection('c')
      .withConverter(converter)
      .doc(toDeleteId)
      .set({ ...puzzleWithComments, del: true });
    await firestore
      .collection('c')
      .withConverter(converter)
      .doc(toKeepId)
      .set(puzzleWithComments);

    // create some notifications
    console.log('made it there!');
    await handlePuzzleUpdate(basePuzzle, puzzleWithComments, toDeleteId);
    console.log('ran update');
    await handlePuzzleUpdate(basePuzzle, puzzleWithComments2, toKeepId);
