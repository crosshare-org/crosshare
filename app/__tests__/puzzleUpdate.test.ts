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

    expect(
      await firestore
        .collection('n')
        .get()
        .then((r) =>
          r.docs
            .map((d) => d.data())
            .map((d) => {
              delete d.t;
              return d;
            })
        )
    ).toMatchInlineSnapshot(`
      [
        {
          "c": "LwgoVx0BAskM4wVJyoLj",
          "cn": "Mike D",
          "e": false,
          "id": "fSEwJorvqOMK5UhNMHa4mu48izl1-comment-LwgoVx0BAskM4wVJyoLj",
          "k": "comment",
          "p": "puzzletodelete",
          "pn": "Raises, as young",
          "r": false,
          "u": "fSEwJorvqOMK5UhNMHa4mu48izl1",
        },
        {
          "c": "randomCommentId",
          "cn": "Mike D",
          "e": false,
          "id": "fSEwJorvqOMK5UhNMHa4mu48izl1-comment-randomCommentId",
          "k": "comment",
          "p": "puzzletokeep",
          "pn": "Raises, as young",
          "r": false,
          "u": "fSEwJorvqOMK5UhNMHa4mu48izl1",
        },
      ]
    `);
    expect(
      await firestore
        .collection('p')
        .get()
        .then((r) => r.docs.map((d) => d.data()))
    ).toMatchInlineSnapshot(`
      [
        {
          "c": "puzzletokeep",
          "ch": false,
          "ct": [],
          "f": true,
          "g": [],
          "rc": [],
          "t": 44,
          "u": "anonymous-user-id",
          "ua": {
            "nanoseconds": 0,
            "seconds": 1604965200,
          },
          "uc": [],
          "vc": [],
          "wc": [],
          "we": [],
        },
        {
          "c": "puzzletodelete",
          "ch": true,
          "ct": [
            1,
            2,
            4,
            100,
            100,
            100,
            100,
            100,
            100,
            100,
            100,
            100,
            100,
            100,
            100,
            100,
            100,
            100,
            100,
            100,
            100,
            100,
            100,
            100,
            100,
          ],
          "f": true,
          "g": [],
          "n": "Puzzle title",
          "rc": [],
          "t": 70,
          "u": "blah",
          "ua": {
            "nanoseconds": 0,
            "seconds": 1604965200,
          },
          "uc": [
            5,
            2,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
          ],
          "vc": [],
          "wc": [],
          "we": [],
        },
      ]
    `);
    expect(
      await firestore
        .collection('c')
        .get()
        .then((r) => r.docs.map((d) => d.data()))
    ).toMatchInlineSnapshot(`
      [
        {
          "a": "fSEwJorvqOMK5UhNMHa4mu48izl1",
          "ac": [
            " Cobbler's forms",
            "Absolutely perfect",
            "Spike Lee's "She's ___ Have It"",
            "English class assignment",
            "Raises, as young",
          ],
          "an": [
            1,
            6,
            7,
            8,
            9,
          ],
          "c": null,
          "cs": [
            {
              "a": "dummy-author-id",
              "c": "A couple of two-worders today which I don't love, but I hope you all got it anyway!",
              "ch": false,
              "i": "LwgoVx0BAskM4wVJyoLj",
              "n": "Mike D",
              "p": {
                "nanoseconds": 0,
                "seconds": 1604966400,
              },
              "t": 36.009,
            },
          ],
          "dc": [
            "Hybrid whose father is a lion",
            "___ of reality (wake-up call)",
            "___ date (makes wedding plans)",
            "Middle Ages invader",
            "Has a great night at the comedy club",
          ],
          "del": true,
          "dn": [
            1,
            2,
            3,
            4,
            5,
          ],
          "f": true,
          "g": [
            "L",
            "A",
            "S",
            "T",
            "S",
            "I",
            "D",
            "E",
            "A",
            "L",
            "G",
            "O",
            "T",
            "T",
            "A",
            "E",
            "S",
            "S",
            "A",
            "Y",
            "R",
            "E",
            "A",
            "R",
            "S",
          ],
          "h": 5,
          "m": false,
          "n": "Mike D",
          "p": {
            "nanoseconds": 0,
            "seconds": 1604966400,
          },
          "pvu": {
            "nanoseconds": 0,
            "seconds": 1604966400,
          },
          "rfm": true,
          "t": "Raises, as young",
          "tg_a": [
            "mini",
            "featured",
          ],
          "tg_i": [
            "featured",
            "mini",
            "featured mini",
          ],
          "w": 5,
        },
        {
          "a": "fSEwJorvqOMK5UhNMHa4mu48izl1",
          "ac": [
            " Cobbler's forms",
            "Absolutely perfect",
            "Spike Lee's "She's ___ Have It"",
            "English class assignment",
            "Raises, as young",
          ],
          "an": [
            1,
            6,
            7,
            8,
            9,
          ],
          "c": null,
          "cs": [
            {
              "a": "dummy-author-id",
              "c": "A couple of two-worders today which I don't love, but I hope you all got it anyway!",
              "ch": false,
              "i": "LwgoVx0BAskM4wVJyoLj",
              "n": "Mike D",
              "p": {
                "nanoseconds": 0,
                "seconds": 1604966400,
              },
              "t": 36.009,
            },
          ],
          "dc": [
            "Hybrid whose father is a lion",
            "___ of reality (wake-up call)",
            "___ date (makes wedding plans)",
            "Middle Ages invader",
            "Has a great night at the comedy club",
          ],
          "dn": [
            1,
            2,
            3,
            4,
            5,
          ],
          "f": true,
          "g": [
            "L",
            "A",
            "S",
            "T",
            "S",
            "I",
            "D",
            "E",
            "A",
            "L",
            "G",
            "O",
            "T",
            "T",
            "A",
            "E",
            "S",
            "S",
            "A",
            "Y",
            "R",
            "E",
            "A",
            "R",
            "S",
          ],
          "h": 5,
          "m": false,
          "n": "Mike D",
          "p": {
            "nanoseconds": 0,
            "seconds": 1604966400,
          },
          "pvu": {
            "nanoseconds": 0,
            "seconds": 1604966400,
          },
          "rfm": true,
          "t": "Raises, as young",
          "tg_a": [
            "mini",
            "featured",
          ],
          "tg_i": [
            "featured",
            "mini",
            "featured mini",
          ],
          "w": 5,
        },
      ]
    `);

    // do the delete
    await handlePuzzleUpdate(
      puzzleWithComments,
      { ...puzzleWithComments, del: true },
      toDeleteId
    );
    await handlePuzzleUpdate(
      puzzleWithComments2,
      { ...puzzleWithComments2, tg_u: ['superman', 'test'] },
      toKeepId
    );

    // and check results
    expect(
      await firestore
        .collection('n')
        .get()
        .then((r) =>
          r.docs
            .map((d) => d.data())
            .map((d) => {
              delete d.t;
              return d;
            })
        )
    ).toMatchInlineSnapshot(`
      [
        {
          "c": "randomCommentId",
          "cn": "Mike D",
          "e": false,
          "id": "fSEwJorvqOMK5UhNMHa4mu48izl1-comment-randomCommentId",
          "k": "comment",
          "p": "puzzletokeep",
          "pn": "Raises, as young",
          "r": false,
          "u": "fSEwJorvqOMK5UhNMHa4mu48izl1",
        },
      ]
    `);
    expect(
      await firestore
        .collection('p')
        .get()
        .then((r) => r.docs.map((d) => d.data()))
    ).toMatchInlineSnapshot(`
      [
        {
          "c": "puzzletokeep",
          "ch": false,
          "ct": [],
          "f": true,
          "g": [],
          "rc": [],
          "t": 44,
          "u": "anonymous-user-id",
          "ua": {
            "nanoseconds": 0,
            "seconds": 1604965200,
          },
          "uc": [],
          "vc": [],
          "wc": [],
          "we": [],
        },
      ]
    `);
    expect(
      await firestore
        .collection('c')
        .get()
        .then((r) => r.docs.map((d) => d.data()))
    ).toMatchInlineSnapshot(`
      [
        {
          "a": "fSEwJorvqOMK5UhNMHa4mu48izl1",
          "ac": [
            " Cobbler's forms",
            "Absolutely perfect",
            "Spike Lee's "She's ___ Have It"",
            "English class assignment",
            "Raises, as young",
          ],
          "an": [
            1,
            6,
            7,
            8,
            9,
          ],
          "c": null,
          "cs": [
            {
              "a": "dummy-author-id",
              "c": "A couple of two-worders today which I don't love, but I hope you all got it anyway!",
              "ch": false,
              "i": "LwgoVx0BAskM4wVJyoLj",
              "n": "Mike D",
              "p": {
                "nanoseconds": 0,
                "seconds": 1604966400,
              },
              "t": 36.009,
            },
          ],
          "dc": [
            "Hybrid whose father is a lion",
            "___ of reality (wake-up call)",
            "___ date (makes wedding plans)",
            "Middle Ages invader",
            "Has a great night at the comedy club",
          ],
          "dn": [
            1,
            2,
            3,
            4,
            5,
          ],
          "f": true,
          "g": [
            "L",
            "A",
            "S",
            "T",
            "S",
            "I",
            "D",
            "E",
            "A",
            "L",
            "G",
            "O",
            "T",
            "T",
            "A",
            "E",
            "S",
            "S",
            "A",
            "Y",
            "R",
            "E",
            "A",
            "R",
            "S",
          ],
          "h": 5,
          "m": false,
          "n": "Mike D",
          "p": {
            "nanoseconds": 0,
            "seconds": 1604966400,
          },
          "pvu": {
            "nanoseconds": 0,
            "seconds": 1604966400,
          },
          "rfm": true,
          "t": "Raises, as young",
          "tg_a": [
            "mini",
            "featured",
          ],
          "tg_i": [
            "featured",
            "mini",
            "featured mini",
            "superman",
            "featured superman",
            "mini superman",
            "featured mini superman",
            "test",
            "featured test",
            "mini test",
            "featured mini test",
            "superman test",
            "featured superman test",
            "mini superman test",
          ],
          "w": 5,
        },
      ]
    `);
    overrideFirestore(null);
    overrideToFirestore(null);
  });
});

test('should remove from notifications when a public puzzle is marked private', async () => {
  await testEnv.clearFirestore();

  await testEnv.withSecurityRulesDisabled(async (adminApp) => {
    const firestore = adminApp.firestore();
    overrideFirestore(firestore as unknown as FirebaseFirestore.Firestore);
    overrideToFirestore(convertTimestamps);

    // create some notifications
    const puzzleWithComments = {
      ...basePuzzle,
      cs: [getComment({ a: 'dummy-author-id' })],
    };
    const puzzleWithComments2 = {
      ...basePuzzle,
      cs: [getComment({ a: 'dummy-author-id', i: 'randomCommentId' })],
    };

    const note1 = newPuzzleNotification(
      { ...puzzleWithComments, id: toDeleteId },
      'fSEwJorvqOMK5UhNMHa4mu48izl1'
    );
    const note2 = newPuzzleNotification(
      { ...puzzleWithComments2, id: toKeepId },
      'fSEwJorvqOMK5UhNMHa4mu48izl1'
    );
    await firestore
      .collection('n')
      .withConverter(converter)
      .doc(note1.id)
      .set(note1);
    await firestore
      .collection('n')
      .withConverter(converter)
      .doc(note2.id)
      .set(note2);

    // create the actual puzzles
    await firestore
      .collection('c')
      .withConverter(converter)
      .doc(toDeleteId)
      .set(puzzleWithComments);
    await firestore
      .collection('c')
      .withConverter(converter)
      .doc(toKeepId)
      .set(puzzleWithComments2);

    expect(
      await firestore
        .collection('n')
        .get()
        .then((r) =>
          r.docs
            .map((d) => d.data())
            .map((d) => {
              delete d.t;
              return d;
            })
        )
    ).toMatchInlineSnapshot(`
      [
        {
          "an": "Mike D",
          "e": false,
          "id": "fSEwJorvqOMK5UhNMHa4mu48izl1-newpuzzle-puzzletodelete",
          "k": "newpuzzle",
          "p": "puzzletodelete",
          "pn": "Raises, as young",
          "r": false,
          "u": "fSEwJorvqOMK5UhNMHa4mu48izl1",
        },
        {
          "an": "Mike D",
          "e": false,
          "id": "fSEwJorvqOMK5UhNMHa4mu48izl1-newpuzzle-puzzletokeep",
          "k": "newpuzzle",
          "p": "puzzletokeep",
          "pn": "Raises, as young",
          "r": false,
          "u": "fSEwJorvqOMK5UhNMHa4mu48izl1",
        },
      ]
    `);

    // mark as private
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { pvu, ...withoutPVU } = puzzleWithComments;
    await handlePuzzleUpdate(
      puzzleWithComments,
      { ...withoutPVU, pv: true },
      toDeleteId
    );
    await handlePuzzleUpdate(
      puzzleWithComments2,
      puzzleWithComments2,
      toKeepId
    );

    // and check results
    expect(
      await firestore
        .collection('n')
        .get()
        .then((r) =>
          r.docs
            .map((d) => d.data())
            .map((d) => {
              delete d.t;
              return d;
            })
        )
    ).toMatchInlineSnapshot(`
      [
        {
          "an": "Mike D",
          "e": false,
          "id": "fSEwJorvqOMK5UhNMHa4mu48izl1-newpuzzle-puzzletokeep",
          "k": "newpuzzle",
          "p": "puzzletokeep",
          "pn": "Raises, as young",
          "r": false,
          "u": "fSEwJorvqOMK5UhNMHa4mu48izl1",
        },
      ]
    `);
    overrideFirestore(null);
    overrideToFirestore(null);
  });
});

test('should remove from notifications when a public puzzle is marked private until', async () => {
  await testEnv.clearFirestore();

  await testEnv.withSecurityRulesDisabled(async (adminApp) => {
    const firestore = adminApp.firestore();
    overrideFirestore(firestore as unknown as FirebaseFirestore.Firestore);
    overrideToFirestore(convertTimestamps);

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
      .set(puzzleWithComments);
    await firestore
      .collection('c')
      .withConverter(converter)
      .doc(toKeepId)
      .set(puzzleWithComments2);

    // create some notifications
    await handlePuzzleUpdate(basePuzzle, puzzleWithComments, toDeleteId);
    await handlePuzzleUpdate(basePuzzle, puzzleWithComments2, toKeepId);

    expect(
      await firestore
        .collection('n')
        .get()
        .then((r) =>
          r.docs
            .map((d) => d.data())
            .map((d) => {
              delete d.t;
              return d;
            })
        )
    ).toMatchInlineSnapshot(`
      [
        {
          "c": "LwgoVx0BAskM4wVJyoLj",
          "cn": "Mike D",
          "e": false,
          "id": "fSEwJorvqOMK5UhNMHa4mu48izl1-comment-LwgoVx0BAskM4wVJyoLj",
          "k": "comment",
          "p": "puzzletodelete",
          "pn": "Raises, as young",
          "r": false,
          "u": "fSEwJorvqOMK5UhNMHa4mu48izl1",
        },
        {
          "c": "randomCommentId",
          "cn": "Mike D",
          "e": false,
          "id": "fSEwJorvqOMK5UhNMHa4mu48izl1-comment-randomCommentId",
          "k": "comment",
          "p": "puzzletokeep",
          "pn": "Raises, as young",
          "r": false,
          "u": "fSEwJorvqOMK5UhNMHa4mu48izl1",
        },
      ]
    `);

    // mark as private
    await handlePuzzleUpdate(
      puzzleWithComments,
      { ...puzzleWithComments, pvu: Timestamp.fromDate(baseTime) },
      toDeleteId
    );
    await handlePuzzleUpdate(
      puzzleWithComments2,
      puzzleWithComments2,
      toKeepId
    );

    // and check results
    expect(
      await firestore
        .collection('n')
        .get()
        .then((r) =>
          r.docs
            .map((d) => d.data())
            .map((d) => {
              delete d.t;
              return d;
            })
        )
    ).toMatchInlineSnapshot(`
      [
        {
          "c": "LwgoVx0BAskM4wVJyoLj",
          "cn": "Mike D",
          "e": false,
          "id": "fSEwJorvqOMK5UhNMHa4mu48izl1-comment-LwgoVx0BAskM4wVJyoLj",
          "k": "comment",
          "p": "puzzletodelete",
          "pn": "Raises, as young",
          "r": false,
          "u": "fSEwJorvqOMK5UhNMHa4mu48izl1",
        },
        {
          "c": "randomCommentId",
          "cn": "Mike D",
          "e": false,
          "id": "fSEwJorvqOMK5UhNMHa4mu48izl1-comment-randomCommentId",
          "k": "comment",
          "p": "puzzletokeep",
          "pn": "Raises, as young",
          "r": false,
          "u": "fSEwJorvqOMK5UhNMHa4mu48izl1",
        },
      ]
    `);
    overrideFirestore(null);
    overrideToFirestore(null);
  });
});

test('should update indexes when a private puzzle is marked public', async () => {
  await testEnv.clearFirestore();

  await testEnv.withSecurityRulesDisabled(async (adminApp) => {
    const firestore = adminApp.firestore();
    overrideFirestore(firestore as unknown as FirebaseFirestore.Firestore);
    overrideToFirestore(convertTimestamps);

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
      .set({ ...puzzleWithComments, pv: true });
    await firestore
      .collection('c')
      .withConverter(converter)
      .doc(toKeepId)
      .set({ ...puzzleWithComments2, pv: true });

    // create some notifications
    await handlePuzzleUpdate(basePuzzle, puzzleWithComments, toDeleteId);
    await handlePuzzleUpdate(basePuzzle, puzzleWithComments2, toKeepId);

    expect(
      await firestore
        .collection('n')
        .get()
        .then((r) =>
          r.docs
            .map((d) => d.data())
            .map((d) => {
              delete d.t;
              return d;
            })
        )
    ).toMatchInlineSnapshot(`
      [
        {
          "c": "LwgoVx0BAskM4wVJyoLj",
          "cn": "Mike D",
          "e": false,
          "id": "fSEwJorvqOMK5UhNMHa4mu48izl1-comment-LwgoVx0BAskM4wVJyoLj",
          "k": "comment",
          "p": "puzzletodelete",
          "pn": "Raises, as young",
          "r": false,
          "u": "fSEwJorvqOMK5UhNMHa4mu48izl1",
        },
        {
          "c": "randomCommentId",
          "cn": "Mike D",
          "e": false,
          "id": "fSEwJorvqOMK5UhNMHa4mu48izl1-comment-randomCommentId",
          "k": "comment",
          "p": "puzzletokeep",
          "pn": "Raises, as young",
          "r": false,
          "u": "fSEwJorvqOMK5UhNMHa4mu48izl1",
        },
      ]
    `);

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
      await firestore
        .collection('n')
        .get()
        .then((r) =>
          r.docs
            .map((d) => d.data())
            .map((d) => {
              delete d.t;
              return d;
            })
        )
    ).toMatchInlineSnapshot(`
      [
        {
          "c": "LwgoVx0BAskM4wVJyoLj",
          "cn": "Mike D",
          "e": false,
          "id": "fSEwJorvqOMK5UhNMHa4mu48izl1-comment-LwgoVx0BAskM4wVJyoLj",
          "k": "comment",
          "p": "puzzletodelete",
          "pn": "Raises, as young",
          "r": false,
          "u": "fSEwJorvqOMK5UhNMHa4mu48izl1",
        },
        {
          "c": "randomCommentId",
          "cn": "Mike D",
          "e": false,
          "id": "fSEwJorvqOMK5UhNMHa4mu48izl1-comment-randomCommentId",
          "k": "comment",
          "p": "puzzletokeep",
          "pn": "Raises, as young",
          "r": false,
          "u": "fSEwJorvqOMK5UhNMHa4mu48izl1",
        },
      ]
    `);
    overrideFirestore(null);
    overrideToFirestore(null);
  });
});

test('should update indexes when a private until puzzle is marked public', async () => {
  await testEnv.clearFirestore();

  await testEnv.withSecurityRulesDisabled(async (adminApp) => {
    const firestore = adminApp.firestore();
    overrideFirestore(firestore as unknown as FirebaseFirestore.Firestore);
    overrideToFirestore(convertTimestamps);

    const puzzleWithComments = {
      ...basePuzzle,
      pvu: Timestamp.fromDate(baseTime),
      cs: [getComment({ a: 'dummy-author-id' })],
    };
    const puzzleWithComments2 = {
      ...basePuzzle,
      pvu: Timestamp.fromDate(baseTime),
      cs: [getComment({ a: 'dummy-author-id', i: 'randomCommentId' })],
    };

    // create the actual puzzles
    await firestore
      .collection('c')
      .withConverter(converter)
      .doc(toDeleteId)
      .set(puzzleWithComments);
    await firestore
      .collection('c')
      .withConverter(converter)
      .doc(toKeepId)
      .set(puzzleWithComments2);

    // create some notifications
    await handlePuzzleUpdate(basePuzzle, puzzleWithComments, toDeleteId);
    await handlePuzzleUpdate(basePuzzle, puzzleWithComments2, toKeepId);

    expect(
      await firestore
        .collection('n')
        .get()
        .then((r) =>
          r.docs
            .map((d) => d.data())
            .map((d) => {
              delete d.t;
              return d;
            })
        )
    ).toMatchInlineSnapshot(`
      [
        {
          "c": "LwgoVx0BAskM4wVJyoLj",
          "cn": "Mike D",
          "e": false,
          "id": "fSEwJorvqOMK5UhNMHa4mu48izl1-comment-LwgoVx0BAskM4wVJyoLj",
          "k": "comment",
          "p": "puzzletodelete",
          "pn": "Raises, as young",
          "r": false,
          "u": "fSEwJorvqOMK5UhNMHa4mu48izl1",
        },
        {
          "c": "randomCommentId",
          "cn": "Mike D",
          "e": false,
          "id": "fSEwJorvqOMK5UhNMHa4mu48izl1-comment-randomCommentId",
          "k": "comment",
          "p": "puzzletokeep",
          "pn": "Raises, as young",
          "r": false,
          "u": "fSEwJorvqOMK5UhNMHa4mu48izl1",
        },
      ]
    `);

    // mark as public
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { pvu, ...updated } = puzzleWithComments;
    await handlePuzzleUpdate(puzzleWithComments, updated, toDeleteId);
    await handlePuzzleUpdate(
      puzzleWithComments2,
      puzzleWithComments2,
      toKeepId
    );

    // and check results
    expect(
      await firestore
        .collection('n')
        .get()
        .then((r) =>
          r.docs
            .map((d) => d.data())
            .map((d) => {
              delete d.t;
              return d;
            })
        )
    ).toMatchInlineSnapshot(`
      [
        {
          "c": "LwgoVx0BAskM4wVJyoLj",
          "cn": "Mike D",
          "e": false,
          "id": "fSEwJorvqOMK5UhNMHa4mu48izl1-comment-LwgoVx0BAskM4wVJyoLj",
          "k": "comment",
          "p": "puzzletodelete",
          "pn": "Raises, as young",
          "r": false,
          "u": "fSEwJorvqOMK5UhNMHa4mu48izl1",
        },
        {
          "c": "randomCommentId",
          "cn": "Mike D",
          "e": false,
          "id": "fSEwJorvqOMK5UhNMHa4mu48izl1-comment-randomCommentId",
          "k": "comment",
          "p": "puzzletokeep",
          "pn": "Raises, as young",
          "r": false,
          "u": "fSEwJorvqOMK5UhNMHa4mu48izl1",
        },
      ]
    `);
    overrideFirestore(null);
    overrideToFirestore(null);
  });
});

test('should update indexes when a private puzzle is marked private until', async () => {
  await testEnv.clearFirestore();

  await testEnv.withSecurityRulesDisabled(async (adminApp) => {
    const firestore = adminApp.firestore();
    overrideFirestore(firestore as unknown as FirebaseFirestore.Firestore);
    overrideToFirestore(convertTimestamps);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { pvu, ...newBase } = basePuzzle;

    await firestore
      .collection('followers')
      .withConverter(converter)
      .doc('fSEwJorvqOMK5UhNMHa4mu48izl1')
      .set({ f: ['dummyuserid'] });

    const puzzleWithComments = {
      ...newBase,
      pv: true,
      cs: [getComment({ a: 'dummy-author-id' })],
    };
    const puzzleWithComments2 = {
      ...newBase,
      pv: true,
      cs: [getComment({ a: 'dummy-author-id', i: 'randomCommentId' })],
    };

    // create the actual puzzles
    await firestore
      .collection('c')
      .withConverter(converter)
      .doc(toDeleteId)
      .set(puzzleWithComments);
    await firestore
      .collection('c')
      .withConverter(converter)
      .doc(toKeepId)
      .set(puzzleWithComments2);

    expect(
      await firestore
        .collection('n')
        .get()
        .then((r) =>
          r.docs
            .map((d) => d.data())
            .map((d) => {
              delete d.t;
              return d;
            })
        )
    ).toMatchInlineSnapshot(`[]`);

    // mark as privateuntil
    const updated: DBPuzzleT = {
      ...puzzleWithComments,
      pv: false,
      pvu: Timestamp.fromDate(baseTime),
    };
    await handlePuzzleUpdate(puzzleWithComments, updated, toDeleteId);
    await handlePuzzleUpdate(
      puzzleWithComments2,
      puzzleWithComments2,
      toKeepId
    );

    // and check results
    expect(
      await firestore
        .collection('n')
        .get()
        .then((r) => r.docs.map((d) => d.data()))
    ).toMatchInlineSnapshot(`
      [
        {
          "an": "Mike D",
          "e": false,
          "id": "dummyuserid-newpuzzle-puzzletodelete",
          "k": "newpuzzle",
          "p": "puzzletodelete",
          "pn": "Raises, as young",
          "r": false,
          "t": {
            "nanoseconds": 0,
            "seconds": 1604966400,
          },
          "u": "dummyuserid",
        },
      ]
    `);

    // Now try changing privateUntil
    await handlePuzzleUpdate(
      updated,
      { ...updated, pvu: Timestamp.fromDate(baseTime2) },
      toDeleteId
    );
    // and check results
    expect(
      await firestore
        .collection('n')
        .get()
        .then((r) => r.docs.map((d) => d.data()))
    ).toMatchInlineSnapshot(`
      [
        {
          "an": "Mike D",
          "e": false,
          "id": "dummyuserid-newpuzzle-puzzletodelete",
          "k": "newpuzzle",
          "p": "puzzletodelete",
          "pn": "Raises, as young",
          "r": false,
          "t": {
            "nanoseconds": 0,
            "seconds": 1607644800,
          },
          "u": "dummyuserid",
        },
      ]
    `);
    overrideFirestore(null);
    overrideToFirestore(null);
  });
});

test('should update indexes when a private until puzzle is marked private', async () => {
  await testEnv.clearFirestore();

  await testEnv.withSecurityRulesDisabled(async (adminApp) => {
    const firestore = adminApp.firestore();
    overrideFirestore(firestore as unknown as FirebaseFirestore.Firestore);
    overrideToFirestore(convertTimestamps);

    // create some notifications
    const puzzleWithComments: DBPuzzleT = {
      ...basePuzzle,
      pv: false,
      pvu: Timestamp.fromDate(baseTime),
      cs: [getComment({ a: 'dummy-author-id' })],
    };
    const puzzleWithComments2: DBPuzzleT = {
      ...basePuzzle,
      pv: false,
      pvu: Timestamp.fromDate(baseTime),
      cs: [getComment({ a: 'dummy-author-id', i: 'randomCommentId' })],
    };

    const note1 = newPuzzleNotification(
      { ...puzzleWithComments, id: toDeleteId },
      'fSEwJorvqOMK5UhNMHa4mu48izl1'
    );
    const note2 = newPuzzleNotification(
      { ...puzzleWithComments2, id: toKeepId },
      'fSEwJorvqOMK5UhNMHa4mu48izl1'
    );
    await firestore
      .collection('n')
      .withConverter(converter)
      .doc(note1.id)
      .set(note1);
    await firestore
      .collection('n')
      .withConverter(converter)
      .doc(note2.id)
      .set(note2);

    // create the actual puzzles
    await firestore
      .collection('c')
      .withConverter(converter)
      .doc(toDeleteId)
      .set(puzzleWithComments);
    await firestore
      .collection('c')
      .withConverter(converter)
      .doc(toKeepId)
      .set(puzzleWithComments2);

    expect(
      await firestore
        .collection('n')
        .get()
        .then((r) =>
          r.docs
            .map((d) => d.data())
            .map((d) => {
              delete d.t;
              return d;
            })
        )
    ).toMatchInlineSnapshot(`
      [
        {
          "an": "Mike D",
          "e": false,
          "id": "fSEwJorvqOMK5UhNMHa4mu48izl1-newpuzzle-puzzletodelete",
          "k": "newpuzzle",
          "p": "puzzletodelete",
          "pn": "Raises, as young",
          "r": false,
          "u": "fSEwJorvqOMK5UhNMHa4mu48izl1",
        },
        {
          "an": "Mike D",
          "e": false,
          "id": "fSEwJorvqOMK5UhNMHa4mu48izl1-newpuzzle-puzzletokeep",
          "k": "newpuzzle",
          "p": "puzzletokeep",
          "pn": "Raises, as young",
          "r": false,
          "u": "fSEwJorvqOMK5UhNMHa4mu48izl1",
        },
      ]
    `);

    // mark as private
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const updated = {
      ...puzzleWithComments,
      pv: true,
      pvu: undefined,
    };
    await handlePuzzleUpdate(puzzleWithComments, updated, toDeleteId);
    await handlePuzzleUpdate(
      puzzleWithComments2,
      puzzleWithComments2,
      toKeepId
    );

    // and check results
    expect(
      await firestore
        .collection('n')
        .get()
        .then((r) =>
          r.docs
            .map((d) => d.data())
            .map((d) => {
              delete d.t;
              return d;
            })
        )
    ).toMatchInlineSnapshot(`
      [
        {
          "an": "Mike D",
          "e": false,
          "id": "fSEwJorvqOMK5UhNMHa4mu48izl1-newpuzzle-puzzletokeep",
          "k": "newpuzzle",
          "p": "puzzletokeep",
          "pn": "Raises, as young",
          "r": false,
          "u": "fSEwJorvqOMK5UhNMHa4mu48izl1",
        },
      ]
    `);
    overrideFirestore(null);
    overrideToFirestore(null);
  });
});
