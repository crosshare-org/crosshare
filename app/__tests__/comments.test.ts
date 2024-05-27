/**
 * @jest-environment node
 */

import {
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { addDoc, collection } from 'firebase/firestore';
import { cloneDeep } from 'lodash';
import { CommentWithRepliesT } from '../lib/dbtypes.js';
import { filterDeletedComments } from '../lib/serverOnly.js';
import { Timestamp } from '../lib/timestamp.js';

const projectId = 'demo-comments-testing';
let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: { host: 'localhost', port: 8080 },
  });
});

test('filtering nested deleted comments', () => {
  const comments: CommentWithRepliesT[] = [
    {
      i: '1',
      c: 'base text',
      a: 'authorid',
      n: 'Author 1',
      t: 0,
      ch: false,
      p: Timestamp.fromDate(new Date(2022, 1, 1)),
      r: [
        {
          i: '2',
          c: 'base text 2',
          a: 'authorid2',
          n: 'Author 2',
          t: 1,
          ch: false,
          p: Timestamp.fromDate(new Date(2022, 1, 2)),
          deleted: true,
          r: [
            {
              i: '3',
              c: 'base text 3',
              a: 'authorid3',
              n: 'Author 3',
              t: 10,
              ch: false,
              p: Timestamp.fromDate(new Date(2022, 1, 3)),
            },
          ],
        },
      ],
    },
  ];
  expect(filterDeletedComments(comments)).toMatchInlineSnapshot(`
    [
      {
        "a": "authorid",
        "c": "base text",
        "ch": false,
        "i": "1",
        "n": "Author 1",
        "p": {
          "nanoseconds": 0,
          "seconds": 1643673600,
        },
        "r": [
          {
            "a": "authorid2",
            "c": "*Comment deleted*",
            "ch": false,
            "deleted": true,
            "i": "2",
            "n": "Author 2",
            "p": {
              "nanoseconds": 0,
              "seconds": 1643760000,
            },
            "r": [
              {
                "a": "authorid3",
                "c": "base text 3",
                "ch": false,
                "i": "3",
                "n": "Author 3",
                "p": {
                  "nanoseconds": 0,
                  "seconds": 1643846400,
                },
                "t": 10,
              },
            ],
            "t": 1,
          },
        ],
        "t": 0,
      },
    ]
  `);

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  comments[0]!.r![0]!.r![0]!.deleted = true;
  expect(filterDeletedComments(comments)).toMatchInlineSnapshot(`
  [
    {
      "a": "authorid",
      "c": "base text",
      "ch": false,
      "i": "1",
      "n": "Author 1",
      "p": {
        "nanoseconds": 0,
        "seconds": 1643673600,
      },
      "t": 0,
    },
  ]
`);
});

test('filtering deleted comments', () => {
  const comments: CommentWithRepliesT[] = [
    {
      i: '1',
      c: 'base text',
      a: 'authorid',
      n: 'Author 1',
      t: 0,
      ch: false,
      p: Timestamp.fromDate(new Date(2022, 1, 1)),
    },
    {
      i: '2',
      c: 'base text 2',
      a: 'authorid2',
      n: 'Author 2',
      t: 1,
      ch: false,
      p: Timestamp.fromDate(new Date(2022, 1, 2)),
      r: [
        {
          i: '3',
          c: 'base text 3',
          a: 'authorid3',
          n: 'Author 3',
          t: 10,
          ch: false,
          p: Timestamp.fromDate(new Date(2022, 1, 3)),
        },
      ],
    },
  ];
  expect(filterDeletedComments(comments)).toEqual(comments);

  const deleteFirst = cloneDeep(comments);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  deleteFirst[0]!.deleted = true;
  expect(filterDeletedComments(deleteFirst)).toMatchInlineSnapshot(`
    [
      {
        "a": "authorid2",
        "c": "base text 2",
        "ch": false,
        "i": "2",
        "n": "Author 2",
        "p": {
          "nanoseconds": 0,
          "seconds": 1643760000,
        },
        "r": [
          {
            "a": "authorid3",
            "c": "base text 3",
            "ch": false,
            "i": "3",
            "n": "Author 3",
            "p": {
              "nanoseconds": 0,
              "seconds": 1643846400,
            },
            "t": 10,
          },
        ],
        "t": 1,
      },
    ]
  `);

  const deleteSecond = cloneDeep(comments);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  deleteSecond[1]!.deleted = true;
  expect(filterDeletedComments(deleteSecond)).toMatchInlineSnapshot(`
    [
      {
        "a": "authorid",
        "c": "base text",
        "ch": false,
        "i": "1",
        "n": "Author 1",
        "p": {
          "nanoseconds": 0,
          "seconds": 1643673600,
        },
        "t": 0,
      },
      {
        "a": "authorid2",
        "c": "*Comment deleted*",
        "ch": false,
        "deleted": true,
        "i": "2",
        "n": "Author 2",
        "p": {
          "nanoseconds": 0,
          "seconds": 1643760000,
        },
        "r": [
          {
            "a": "authorid3",
            "c": "base text 3",
            "ch": false,
            "i": "3",
            "n": "Author 3",
            "p": {
              "nanoseconds": 0,
              "seconds": 1643846400,
            },
            "t": 10,
          },
        ],
        "t": 1,
      },
    ]
  `);

  const modSecond = cloneDeep(comments);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  modSecond[1]!.deleted = true;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  modSecond[1]!.removed = true;
  expect(filterDeletedComments(modSecond)).toMatchInlineSnapshot(`
    [
      {
        "a": "authorid",
        "c": "base text",
        "ch": false,
        "i": "1",
        "n": "Author 1",
        "p": {
          "nanoseconds": 0,
          "seconds": 1643673600,
        },
        "t": 0,
      },
      {
        "a": "authorid2",
        "c": "*Comment removed*",
        "ch": false,
        "deleted": true,
        "i": "2",
        "n": "Author 2",
        "p": {
          "nanoseconds": 0,
          "seconds": 1643760000,
        },
        "r": [
          {
            "a": "authorid3",
            "c": "base text 3",
            "ch": false,
            "i": "3",
            "n": "Author 3",
            "p": {
              "nanoseconds": 0,
              "seconds": 1643846400,
            },
            "t": 10,
          },
        ],
        "removed": true,
        "t": 1,
      },
    ]
  `);

  const deleteInner = cloneDeep(comments);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  deleteInner[1]!.r![0]!.deleted = true;
  expect(filterDeletedComments(deleteInner)).toMatchInlineSnapshot(`
    [
      {
        "a": "authorid",
        "c": "base text",
        "ch": false,
        "i": "1",
        "n": "Author 1",
        "p": {
          "nanoseconds": 0,
          "seconds": 1643673600,
        },
        "t": 0,
      },
      {
        "a": "authorid2",
        "c": "base text 2",
        "ch": false,
        "i": "2",
        "n": "Author 2",
        "p": {
          "nanoseconds": 0,
          "seconds": 1643760000,
        },
        "t": 1,
      },
    ]
  `);
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
  /** Should fail when trying to mark approved, though */
  await assertFails(
    firestore
      .collection('cfm')
      .add({ c: 'comment text', a: 'mike' })
      .then((dr) => dr.update({ approved: true }))
  );
});

test('security rules should only allow commenting with username if it matches your account', async () => {
  const firestore = testEnv.authenticatedContext('mike').firestore();

  await testEnv.withSecurityRulesDisabled(async (ctxt) => {
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
  const firestore = testEnv
    .authenticatedContext('mike', {
      firebase: { sign_in_provider: 'anonymous' },
    })
    .firestore();
  const firestoreNonAnon = testEnv
    .authenticatedContext('mike', {
      firebase: { sign_in_provider: 'google.com' },
    })
    .firestore();

  await assertFails(firestore.collection('cfm').add({ c: 'comment text' }));
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

test('security rules should allow an admin to add cfm', async () => {
  const adminFirestore = testEnv
    .authenticatedContext('mike', {
      firebase: { sign_in_provider: 'google.com' },
      admin: true,
    })
    .firestore();

  // make sure we can post as any user and mark approved
  await assertSucceeds(
    adminFirestore
      .collection('cfm')
      .add({ c: 'comment text', a: 'any-user' })
      .then((dr) => dr.update({ approved: true }))
  );
});
