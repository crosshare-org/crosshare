/**
 * @jest-environment node
 */

import * as firebaseTesting from '@firebase/rules-unit-testing';
import type firebase from 'firebase/app';

import { getMockedPuzzle } from '../lib/testingUtils';
import {
  notificationsForPuzzleChange,
  NotificationT,
} from '../lib/notifications';
import { CommentWithRepliesT } from '../lib/dbtypes';
import {
  TimestampClass,
  setAdminApp,
  setUserMap,
} from '../lib/firebaseWrapper';
import { queueEmails } from '../lib/serverOnly';
import type firebaseAdminType from 'firebase-admin';
import add from 'date-fns/add';
import MockDate from 'mockdate';

jest.mock('../lib/firebaseWrapper');

const basePuzzle = getMockedPuzzle({ cs: undefined });

function getComment(
  fields?: Partial<CommentWithRepliesT>
): CommentWithRepliesT {
  return {
    ...{
      c:
        'A couple of two-worders today which I don\'t love, but I hope you all got it anyway!',
      i: 'LwgoVx0BAskM4wVJyoLj',
      t: 36.009,
      p: TimestampClass.now(),
      a: 'fSEwJorvqOMK5UhNMHa4mu48izl1',
      n: 'Mike D',
      ch: false,
    },
    ...fields,
  };
}

test('shouldnt notify at all if comment is on own puzzle', async () => {
  const puzzleWithComments = {
    ...basePuzzle,
    cs: [getComment({ a: basePuzzle.a })],
  };
  const notifications = await notificationsForPuzzleChange(
    basePuzzle,
    puzzleWithComments,
    'puzzle-id-here'
  );
  expect(notifications.length).toEqual(0);
});

const projectId = 'notificationstests';

test('security rules for updating notifications', async () => {
  const puzzleWithComments = {
    ...basePuzzle,
    cs: [getComment({ a: 'dummy-author-id' })],
  };
  const notifications = await notificationsForPuzzleChange(
    basePuzzle,
    puzzleWithComments,
    'puzzle-id-here'
  );
  expect(notifications.length).toEqual(1);
  if (notifications[0] === undefined) {
    throw new Error();
  }

  await firebaseTesting.clearFirestoreData({ projectId });
  const adminApp = firebaseTesting.initializeAdminApp({
    projectId,
  }) as firebase.app.App;
  await adminApp
    .firestore()
    .collection('n')
    .doc(notifications[0].id)
    .set(notifications[0]);

  const ownerApp = firebaseTesting.initializeTestApp({
    projectId,
    auth: {
      uid: notifications[0].u,
      firebase: {
        sign_in_provider: 'google.com',
      },
    },
  });
  const otherApp = firebaseTesting.initializeTestApp({
    projectId,
    auth: {
      uid: 'randouserid',
      firebase: {
        sign_in_provider: 'google.com',
      },
    },
  });

  // other user can't change read status
  await firebaseTesting.assertFails(
    otherApp
      .firestore()
      .collection('n')
      .doc(notifications[0].id)
      .update({ r: true })
  );
  // owner can't change anything other than read status
  await firebaseTesting.assertFails(
    ownerApp
      .firestore()
      .collection('n')
      .doc(notifications[0].id)
      .update({ c: 'some new comment id' })
  );
  // owner can change read status
  await firebaseTesting.assertSucceeds(
    ownerApp
      .firestore()
      .collection('n')
      .doc(notifications[0].id)
      .update({ r: true })
  );

  await adminApp.delete();
  await ownerApp.delete();
  await otherApp.delete();
});

const removeTimestamp = (n: NotificationT) => {
  const { t, ...rest } = n; // eslint-disable-line @typescript-eslint/no-unused-vars
  return rest;
};

test('should not notify for new puzzle if no subs', async () => {
  const adminApp = firebaseTesting.initializeAdminApp({
    projectId,
  });
  setAdminApp((adminApp as unknown) as firebaseAdminType.app.App);

  const notifications = await notificationsForPuzzleChange(
    undefined,
    basePuzzle,
    'puzzle-id-here'
  );
  expect(notifications.length).toEqual(0);
});

test('should notify for new puzzle if there are subs', async () => {
  const adminApp = firebaseTesting.initializeAdminApp({
    projectId,
  });
  setAdminApp((adminApp as unknown) as firebaseAdminType.app.App);

  await adminApp
    .firestore()
    .doc(`followers/${basePuzzle.a}`)
    .set({ f: ['mikeuserid', 'tomuserid'] });

  const notifications = await notificationsForPuzzleChange(
    undefined,
    basePuzzle,
    'puzzle-id-here'
  );
  expect(notifications.length).toEqual(2);
  expect(notifications.map(removeTimestamp)).toMatchSnapshot();
});

test('should notify for a new comment by somebody else', async () => {
  const puzzleWithComments = {
    ...basePuzzle,
    cs: [getComment({ a: 'dummy-author-id' })],
  };
  const notifications = await notificationsForPuzzleChange(
    basePuzzle,
    puzzleWithComments,
    'puzzle-id-here'
  );
  expect(notifications.length).toEqual(1);
  expect(notifications.map(removeTimestamp)).toMatchSnapshot();
});

test('should notify for multiple comments by somebody else', async () => {
  const puzzleWithComments = {
    ...basePuzzle,
    cs: [
      getComment({ a: basePuzzle.a, i: 'foo' }),
      getComment({ a: 'dummy-author-id', i: 'bar', n: 'Jim' }),
      getComment({ a: 'another-author', i: 'bam', n: 'Tom' }),
    ],
  };
  const notifications = await notificationsForPuzzleChange(
    basePuzzle,
    puzzleWithComments,
    'puzzle-id-here'
  );
  expect(notifications.length).toEqual(2);
  expect(notifications.map(removeTimestamp)).toMatchSnapshot();
});

test('should notify for a reply to own comment on own puzzle', async () => {
  const puzzleWithOwn = {
    ...basePuzzle,
    cs: [getComment({ a: basePuzzle.a })],
  };
  const puzzleWithComments = {
    ...basePuzzle,
    cs: [
      getComment({
        a: basePuzzle.a,
        r: [getComment({ a: 'dummy-author-id', i: 'bar', n: 'Jim' })],
      }),
    ],
  };
  const notifications = await notificationsForPuzzleChange(
    puzzleWithOwn,
    puzzleWithComments,
    'puzzle-id-here'
  );
  expect(notifications.length).toEqual(1);
  expect(notifications.map(removeTimestamp)).toMatchSnapshot();
});

test('should notify comment author only when puzzle author replies', async () => {
  const puzzleWithComment = {
    ...basePuzzle,
    cs: [getComment({ a: 'dummy-author-id' })],
  };
  const authorReplies = {
    ...basePuzzle,
    cs: [
      getComment({
        a: 'dummy-author-id',
        r: [getComment({ a: basePuzzle.a, i: 'baz' })],
      }),
    ],
  };
  const notifications = await notificationsForPuzzleChange(
    puzzleWithComment,
    authorReplies,
    'puzzle-id-here'
  );
  expect(notifications.length).toEqual(1);
  expect(notifications.map(removeTimestamp)).toMatchSnapshot();
});

test('should notify comment author and puzzle author when third party replies', async () => {
  const puzzleWithComment = {
    ...basePuzzle,
    cs: [getComment({ a: 'dummy-author-id' })],
  };
  const authorReplies = {
    ...basePuzzle,
    cs: [
      getComment({
        a: 'dummy-author-id',
        r: [getComment({ a: 'rando', i: 'baz' })],
      }),
    ],
  };
  const notifications = await notificationsForPuzzleChange(
    puzzleWithComment,
    authorReplies,
    'puzzle-id-here'
  );
  expect(notifications.length).toEqual(2);
  expect(notifications.map(removeTimestamp)).toMatchSnapshot();
});

test('should notify author when marked as featured', async () => {
  const notifications = await notificationsForPuzzleChange(
    basePuzzle,
    { ...basePuzzle, f: true },
    'puzzle-id-here'
  );
  expect(notifications.length).toEqual(1);
  expect(notifications.map(removeTimestamp)).toMatchSnapshot();
});

test('should notify author when marked as dailymini', async () => {
  const notifications = await notificationsForPuzzleChange(
    basePuzzle,
    { ...basePuzzle, c: 'dailymini', dmd: '10/29/2020' },
    'puzzle-id-here'
  );
  expect(notifications.length).toEqual(1);
  expect(notifications.map(removeTimestamp)).toMatchSnapshot();
});

test('should handle a combination of multiple new comments and nested replies', async () => {
  const startingPoint = {
    ...basePuzzle,
    cs: [getComment({ r: [getComment({ a: 'rando', i: 'baz' })] })],
  };
  const withReplies = {
    ...basePuzzle,
    cs: [
      getComment({ a: 'blaster', i: 'bam', n: 'BLAST' }),
      getComment({
        r: [
          getComment({
            a: 'rando',
            i: 'baz',
            r: [
              getComment({ i: 'whamo' }),
              getComment({ a: 'blaster', i: 'test' }),
            ],
          }),
          getComment({ a: 'another-rando', i: 'foobar' }),
        ],
      }),
    ],
  };
  const notifications = await notificationsForPuzzleChange(
    startingPoint,
    withReplies,
    'puzzle-id-here'
  );
  expect(notifications.length).toEqual(5);
  expect(notifications.map(removeTimestamp)).toMatchSnapshot();
});

describe('email queueing', () => {
  let adminApp: firebaseAdminType.app.App;

  beforeEach(async () => {
    const startingPoint = {
      ...basePuzzle,
      cs: [getComment({ r: [getComment({ a: 'rando', i: 'baz' })] })],
    };
    const withReplies = {
      ...basePuzzle,
      cs: [
        getComment({ a: 'blaster', i: 'bam', n: 'BLAST' }),
        getComment({
          r: [
            getComment({
              a: 'rando',
              i: 'baz',
              r: [
                getComment({ i: 'whamo' }),
                getComment({ a: 'blaster', i: 'test' }),
              ],
            }),
            getComment({ a: 'another-rando', i: 'foobar' }),
          ],
        }),
      ],
    };

    const notifications = await notificationsForPuzzleChange(
      startingPoint,
      withReplies,
      'puzzle-id-here'
    );

    expect(notifications.length).toEqual(5);
    await firebaseTesting.clearFirestoreData({ projectId });
    adminApp = (firebaseTesting.initializeAdminApp({
      projectId,
    }) as unknown) as firebaseAdminType.app.App;
    setAdminApp(adminApp);
    await adminApp
      .firestore()
      .doc(`followers/${basePuzzle.a}`)
      .set({ f: ['mikeuserid', 'rando'] });

    notifications.push(
      ...(await notificationsForPuzzleChange(undefined, basePuzzle, 'wowowo'))
    );

    // Private puzzle should have no effect
    notifications.push(
      ...(await notificationsForPuzzleChange(
        undefined,
        { ...basePuzzle, id: 'foo', pv: true },
        'foo'
      ))
    );

    expect(notifications.length).toEqual(7);

    for (const notification of notifications) {
      await adminApp
        .firestore()
        .collection('n')
        .doc(notification.id)
        .set(notification);
    }
    await adminApp
      .firestore()
      .collection('prefs')
      .doc('rando')
      .set({ unsubs: ['newpuzzles'] }, { merge: true });
    setUserMap({
      rando: { email: 'rando@example.com' } as firebase.User,
      [basePuzzle.a]: { email: 'mike@example.com' } as firebase.User,
    });
  });

  afterEach(async () => {
    await adminApp.delete();
    MockDate.reset();
  });

  test('nothing sends until an hour after comments are posted', async () => {
    await queueEmails();
    const mail = await adminApp.firestore().collection('mail').get();
    expect(mail.size).toEqual(0);
  });

  test('email for puzzle marked as featured', async () => {
    const notifications = await notificationsForPuzzleChange(
      basePuzzle,
      { ...basePuzzle, f: true },
      'blast'
    );
    expect(notifications.length).toEqual(1);
    if (notifications[0] === undefined) {
      throw new Error();
    }
    await adminApp
      .firestore()
      .collection('n')
      .doc(notifications[0].id)
      .set(notifications[0]);
    await queueEmails();
    const mail = await adminApp.firestore().collection('mail').get();
    expect(mail.size).toEqual(1);
    if (mail.docs[0] === undefined) {
      throw new Error();
    }
    expect(mail.docs[0].data()).toMatchSnapshot();
  });

  test('email for puzzle marked as daily mini', async () => {
    const notifications = await notificationsForPuzzleChange(
      basePuzzle,
      { ...basePuzzle, c: 'dailymini', dmd: '10/20/2020' },
      'blast'
    );
    expect(notifications.length).toEqual(1);
    if (notifications[0] === undefined) {
      throw new Error();
    }
    await adminApp
      .firestore()
      .collection('n')
      .doc(notifications[0].id)
      .set(notifications[0]);
    await queueEmails();
    const mail = await adminApp.firestore().collection('mail').get();
    expect(mail.size).toEqual(1);
    if (mail.docs[0] === undefined) {
      throw new Error();
    }
    expect(mail.docs[0].data()).toMatchSnapshot();
  });

  test('email including new puzzle notification', async () => {
    await adminApp.firestore().doc('prefs/rando').delete();
    await queueEmails();
    const mail = await adminApp.firestore().collection('mail').get();
    expect(mail.size).toEqual(1);
    if (mail.docs[0] === undefined) {
      throw new Error();
    }
    expect(mail.docs[0].data()).toMatchSnapshot();
  });

  const twoHours = add(new Date(), { hours: 2 });

  test('emails send after an hour, but dont double send', async () => {
    MockDate.set(twoHours);
    await queueEmails();
    // we can do it again immediately and we shouldn't double send due to marking as read
    await queueEmails();

    const mail2 = await adminApp.firestore().collection('mail').get();
    expect(mail2.size).toEqual(2);
    expect(
      mail2.docs
        .map((d) => d.data())
        .sort((a, b) => a.to[0].localeCompare(b.to[0]))
    ).toMatchSnapshot();
  });

  test('emails including both comments and new puzzle notifications', async () => {
    await adminApp.firestore().doc('prefs/rando').delete();
    MockDate.set(twoHours);
    await queueEmails();
    // we can do it again immediately and we shouldn't double send due to marking as read
    await queueEmails();

    const mail2 = await adminApp.firestore().collection('mail').get();
    expect(mail2.size).toEqual(2);
    expect(
      mail2.docs
        .map((d) => d.data())
        .sort((a, b) => a.to[0].localeCompare(b.to[0]))
    ).toMatchSnapshot();
  });

  test('dont send if unsubscribed to all', async () => {
    MockDate.set(twoHours);
    await adminApp
      .firestore()
      .collection('prefs')
      .doc('rando')
      .set({ unsubs: ['all'] }, { merge: true });

    // Nothing has been emailed, nothing read
    expect(
      (await adminApp.firestore().collection('n').where('e', '==', false).get())
        .size
    ).toEqual(7);
    expect(
      (await adminApp.firestore().collection('n').where('r', '==', false).get())
        .size
    ).toEqual(7);

    await queueEmails();

    // We should have marked everything as emailed
    expect(
      (await adminApp.firestore().collection('n').where('e', '==', false).get())
        .size
    ).toEqual(0);
    // But not necessarily as read
    expect(
      (await adminApp.firestore().collection('n').where('r', '==', false).get())
        .size
    ).toEqual(4);

    const mail2 = await adminApp.firestore().collection('mail').get();
    expect(mail2.size).toEqual(1);
    if (mail2.docs[0] === undefined) {
      throw new Error();
    }
    expect(mail2.docs[0].data()).toMatchSnapshot();
  });

  test('dont send if unsubscribed to comments and thats all we have', async () => {
    MockDate.set(twoHours);
    await adminApp
      .firestore()
      .collection('prefs')
      .doc(basePuzzle.a)
      .set({ unsubs: ['comments'] }, { merge: true });

    // Nothing has been emailed, nothing read
    expect(
      (await adminApp.firestore().collection('n').where('e', '==', false).get())
        .size
    ).toEqual(7);
    expect(
      (await adminApp.firestore().collection('n').where('r', '==', false).get())
        .size
    ).toEqual(7);

    await queueEmails();

    // We should have marked everything as emailed
    expect(
      (await adminApp.firestore().collection('n').where('e', '==', false).get())
        .size
    ).toEqual(0);
    // But not necessarily as read
    expect(
      (await adminApp.firestore().collection('n').where('r', '==', false).get())
        .size
    ).toEqual(5);

    const mail2 = await adminApp.firestore().collection('mail').get();
    expect(mail2.size).toEqual(1);
    if (mail2.docs[0] === undefined) {
      throw new Error();
    }
    expect(mail2.docs[0].data()).toMatchSnapshot();
  });

  test('emails work w/ multiple puzzles and w/ html in title', async () => {
    const puzzleWithComment = getMockedPuzzle({
      t: 'Our Second <span> Title',
      cs: [getComment({ a: 'rando' })],
    });
    const withReplies = {
      ...puzzleWithComment,
      cs: [
        getComment({
          a: 'rando',
          r: [
            getComment({
              a: 'anotherAuthor',
              n: 'Commenter <div> Foo',
              i: 'baz',
            }),
          ],
        }),
      ],
    };
    const notifications = await notificationsForPuzzleChange(
      puzzleWithComment,
      withReplies,
      'second-puzzle'
    );
    expect(notifications.length).toEqual(2);
    for (const notification of notifications) {
      await adminApp
        .firestore()
        .collection('n')
        .doc(notification.id)
        .set(notification);
    }

    MockDate.set(twoHours);
    await queueEmails();

    const mail2 = await adminApp.firestore().collection('mail').get();
    expect(mail2.size).toEqual(2);
    expect(
      mail2.docs
        .map((d) => d.data())
        .sort((a, b) => a.to[0].localeCompare(b.to[0]))
    ).toMatchSnapshot();
  });

  test('emails work w/ multiple categories of comments', async () => {
    const puzzleWithComment = getMockedPuzzle({
      a: 'rando',
      t: 'Our Second Title',
      cs: [getComment({ a: basePuzzle.a })],
    });
    const withReplies = {
      ...puzzleWithComment,
      cs: [
        getComment({
          a: basePuzzle.a,
          r: [getComment({ a: 'anotherAuthor', n: 'Foo Bar', i: 'baz' })],
        }),
      ],
    };
    const notifications = await notificationsForPuzzleChange(
      puzzleWithComment,
      withReplies,
      'second-puzzle'
    );
    expect(notifications.length).toEqual(2);
    for (const notification of notifications) {
      await adminApp
        .firestore()
        .collection('n')
        .doc(notification.id)
        .set(notification);
    }

    MockDate.set(twoHours);
    await queueEmails();

    const mail2 = await adminApp.firestore().collection('mail').get();
    expect(mail2.size).toEqual(2);
    expect(
      mail2.docs
        .map((d) => d.data())
        .sort((a, b) => a.to[0].localeCompare(b.to[0]))
    ).toMatchSnapshot();
  });
});
