import * as firebaseTesting from '@firebase/testing';

import { getMockedPuzzle } from '../lib/testingUtils';
import { notificationsForPuzzleChange } from '../lib/notifications';
import { CommentWithRepliesT } from '../lib/dbtypes';
import { TimestampClass, setAdminApp, setUserMap } from '../lib/firebaseWrapper';
import { queueEmails } from '../lib/serverOnly';
import type firebaseAdminType from 'firebase-admin';
import add from 'date-fns/add';

jest.mock('../lib/firebaseWrapper');

const basePuzzle = getMockedPuzzle({ cs: undefined });

function getComment(fields?: Partial<CommentWithRepliesT>): CommentWithRepliesT {
  return {
    ...{
      c: 'A couple of two-worders today which I don\'t love, but I hope you all got it anyway!',
      i: 'LwgoVx0BAskM4wVJyoLj',
      t: 36.009,
      p: TimestampClass.now(),
      a: 'fSEwJorvqOMK5UhNMHa4mu48izl1',
      n: 'Mike D',
      ch: false,
    },
    ...fields
  };
}

test('shouldnt notify at all if comment is on own puzzle', () => {
  const puzzleWithComments = {
    ...basePuzzle,
    cs: [getComment({ a: basePuzzle.a })]
  };
  const notifications = notificationsForPuzzleChange(basePuzzle, puzzleWithComments, 'puzzle-id-here');
  expect(notifications.length).toEqual(0);
});

const projectId = 'notificationstests';

test('security rules for updating notifications', async () => {
  const puzzleWithComments = {
    ...basePuzzle,
    cs: [getComment({ a: 'dummy-author-id' })]
  };
  const notifications = notificationsForPuzzleChange(basePuzzle, puzzleWithComments, 'puzzle-id-here');
  expect(notifications.length).toEqual(1);

  await firebaseTesting.clearFirestoreData({ projectId });
  const adminApp = firebaseTesting.initializeAdminApp({ projectId }) as firebase.app.App;
  await adminApp.firestore().collection('n').doc(notifications[0].id).set(notifications[0]);

  const ownerApp = firebaseTesting.initializeTestApp({
    projectId,
    auth: {
      uid: notifications[0].u,
      admin: false,
      firebase: {
        sign_in_provider: 'google.com',
      },
    },
  });
  const otherApp = firebaseTesting.initializeTestApp({
    projectId,
    auth: {
      uid: 'randouserid',
      admin: false,
      firebase: {
        sign_in_provider: 'google.com',
      },
    },
  });

  // other user can't change read status
  await firebaseTesting.assertFails(
    otherApp.firestore().collection('n').doc(notifications[0].id).update({ r: true })
  );
  // owner can't change anything other than read status
  await firebaseTesting.assertFails(
    ownerApp.firestore().collection('n').doc(notifications[0].id).update({ c: 'some new comment id' })
  );
  // owner can change read status
  await firebaseTesting.assertSucceeds(
    ownerApp.firestore().collection('n').doc(notifications[0].id).update({ r: true })
  );

  adminApp.delete();
  ownerApp.delete();
  otherApp.delete();
});

test('should notify for a new comment by somebody else', () => {
  const puzzleWithComments = {
    ...basePuzzle,
    cs: [getComment({ a: 'dummy-author-id' })]
  };
  const notifications = notificationsForPuzzleChange(basePuzzle, puzzleWithComments, 'puzzle-id-here');
  expect(notifications.length).toEqual(1);
  notifications.forEach(n => { delete n.t; });
  expect(notifications).toMatchSnapshot();
});

test('should notify for multiple comments by somebody else', () => {
  const puzzleWithComments = {
    ...basePuzzle,
    cs: [
      getComment({ a: basePuzzle.a, i: 'foo' }),
      getComment({ a: 'dummy-author-id', i: 'bar', n: 'Jim' }),
      getComment({ a: 'another-author', i: 'bam', n: 'Tom' }),
    ]
  };
  const notifications = notificationsForPuzzleChange(basePuzzle, puzzleWithComments, 'puzzle-id-here');
  expect(notifications.length).toEqual(2);
  notifications.forEach(n => { delete n.t; });
  expect(notifications).toMatchSnapshot();
});

test('should notify for a reply to own comment on own puzzle', () => {
  const puzzleWithOwn = {
    ...basePuzzle,
    cs: [getComment({ a: basePuzzle.a })]
  };
  const puzzleWithComments = {
    ...basePuzzle,
    cs: [getComment({ a: basePuzzle.a, r: [getComment({ a: 'dummy-author-id', i: 'bar', n: 'Jim' })] })]
  };
  const notifications = notificationsForPuzzleChange(puzzleWithOwn, puzzleWithComments, 'puzzle-id-here');
  expect(notifications.length).toEqual(1);
  notifications.forEach(n => { delete n.t; });
  expect(notifications).toMatchSnapshot();
});

test('should notify comment author only when puzzle author replies', () => {
  const puzzleWithComment = {
    ...basePuzzle,
    cs: [getComment({ a: 'dummy-author-id' })]
  };
  const authorReplies = {
    ...basePuzzle,
    cs: [getComment({ a: 'dummy-author-id', r: [getComment({ a: basePuzzle.a, i: 'baz' })] })]
  };
  const notifications = notificationsForPuzzleChange(puzzleWithComment, authorReplies, 'puzzle-id-here');
  expect(notifications.length).toEqual(1);
  notifications.forEach(n => { delete n.t; });
  expect(notifications).toMatchSnapshot();
});

test('should notify comment author and puzzle author when third party replies', () => {
  const puzzleWithComment = {
    ...basePuzzle,
    cs: [getComment({ a: 'dummy-author-id' })]
  };
  const authorReplies = {
    ...basePuzzle,
    cs: [getComment({ a: 'dummy-author-id', r: [getComment({ a: 'rando', i: 'baz' })] })]
  };
  const notifications = notificationsForPuzzleChange(puzzleWithComment, authorReplies, 'puzzle-id-here');
  expect(notifications.length).toEqual(2);
  notifications.forEach(n => { delete n.t; });
  expect(notifications).toMatchSnapshot();
});

test('should handle a combination of multiple new comments and nested replies', () => {
  const startingPoint = {
    ...basePuzzle,
    cs: [getComment({ r: [getComment({ a: 'rando', i: 'baz' })] })]
  };
  const withReplies = {
    ...basePuzzle,
    cs: [
      getComment({ a: 'blaster', i: 'bam', n: 'BLAST' }),
      getComment({
        r: [
          getComment({
            a: 'rando', i: 'baz', r: [
              getComment({ i: 'whamo' }),
              getComment({ a: 'blaster', i: 'test' })
            ]
          }),
          getComment({ a: 'another-rando', i: 'foobar' })
        ]
      })
    ]
  };
  const notifications = notificationsForPuzzleChange(startingPoint, withReplies, 'puzzle-id-here');
  expect(notifications.length).toEqual(5);
  notifications.forEach(n => { delete n.t; });
  expect(notifications).toMatchSnapshot();
});

describe('email queueing', () => {
  let adminApp: firebaseAdminType.app.App;
  const realDate = Date;

  beforeEach(async () => {
    const startingPoint = {
      ...basePuzzle,
      cs: [getComment({ r: [getComment({ a: 'rando', i: 'baz' })] })]
    };
    const withReplies = {
      ...basePuzzle,
      cs: [
        getComment({ a: 'blaster', i: 'bam', n: 'BLAST' }),
        getComment({
          r: [
            getComment({
              a: 'rando', i: 'baz', r: [
                getComment({ i: 'whamo' }),
                getComment({ a: 'blaster', i: 'test' })
              ]
            }),
            getComment({ a: 'another-rando', i: 'foobar' })
          ]
        })
      ]
    };
    const notifications = notificationsForPuzzleChange(startingPoint, withReplies, 'puzzle-id-here');
    expect(notifications.length).toEqual(5);
    await firebaseTesting.clearFirestoreData({ projectId });
    adminApp = firebaseTesting.initializeAdminApp({ projectId }) as unknown as firebaseAdminType.app.App;
    setAdminApp(adminApp);
    for (const notification of notifications) {
      await adminApp.firestore().collection('n').doc(notification.id).set(notification);
    }
    setUserMap({ rando: { email: 'rando@example.com' } as firebase.User, [basePuzzle.a]: { email: 'mike@example.com' } as firebase.User });
  });

  afterEach(async () => {
    await adminApp.delete();
  });

  async function withMockedDate(work: () => Promise<void>) {
    const mockDate = add(new Date(), { hours: 2 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).Date = class extends realDate {
      constructor() {
        super();
        return mockDate;
      }
    };
    await work();

    global.Date = realDate;
  }

  test('nothing sends until an hour after comments are posted', async () => {
    await queueEmails();
    const mail = await adminApp.firestore().collection('mail').get();
    expect(mail.size).toEqual(0);
  });

  test('emails send after an hour, but dont double send', async () => {
    return withMockedDate(async () => {
      await queueEmails();
      // we can do it again immediately and we shouldn't double send due to marking as read
      await queueEmails();

      const mail2 = await adminApp.firestore().collection('mail').get();
      expect(mail2.size).toEqual(2);
      expect(mail2.docs.map(d => d.data()).sort((a, b) => a.to[0].localeCompare(b.to[0]))).toMatchSnapshot();
    });
  });

  test('dont send if unsubscribed to all', async () => {
    return withMockedDate(async () => {
      await adminApp.firestore().collection('prefs').doc('rando').set({ unsubs: ['all'] }, { merge: true });

      await queueEmails();

      // We should still have marked everything as read
      expect((await adminApp.firestore().collection('n').where('r', '==', false).get()).size).toEqual(0);

      const mail2 = await adminApp.firestore().collection('mail').get();
      expect(mail2.size).toEqual(1);
      expect(mail2.docs[0].data()).toMatchSnapshot();
    });
  });

  test('dont send if unsubscribed to comments and thats all we have', async () => {
    return withMockedDate(async () => {
      await adminApp.firestore().collection('prefs').doc(basePuzzle.a).set({ unsubs: ['comments'] }, { merge: true });

      await queueEmails();

      // We should still have marked everything as read
      expect((await adminApp.firestore().collection('n').where('r', '==', false).get()).size).toEqual(0);

      const mail2 = await adminApp.firestore().collection('mail').get();
      expect(mail2.size).toEqual(1);
      expect(mail2.docs[0].data()).toMatchSnapshot();
    });
  });

  test('emails work w/ multiple puzzles and w/ html in title', async () => {
    const puzzleWithComment = getMockedPuzzle({
      t: 'Our Second <span> Title',
      cs: [getComment({ a: 'rando' })]
    });
    const withReplies = {
      ...puzzleWithComment,
      cs: [getComment({ a: 'rando', r: [getComment({ a: 'anotherAuthor', n: 'Commenter <div> Foo', i: 'baz' })] })]
    };
    const notifications = notificationsForPuzzleChange(puzzleWithComment, withReplies, 'second-puzzle');
    expect(notifications.length).toEqual(2);
    for (const notification of notifications) {
      await adminApp.firestore().collection('n').doc(notification.id).set(notification);
    }

    return withMockedDate(async () => {

      await queueEmails();

      const mail2 = await adminApp.firestore().collection('mail').get();
      expect(mail2.size).toEqual(2);
      expect(mail2.docs.map(d => d.data()).sort((a, b) => a.to[0].localeCompare(b.to[0]))).toMatchSnapshot();
    });
  });

  test('emails work w/ multiple categories of comments', async () => {
    const puzzleWithComment = getMockedPuzzle({
      a: 'rando',
      t: 'Our Second Title',
      cs: [getComment({ a: basePuzzle.a })]
    });
    const withReplies = {
      ...puzzleWithComment,
      cs: [getComment({ a: basePuzzle.a, r: [getComment({ a: 'anotherAuthor', n: 'Foo Bar', i: 'baz' })] })]
    };
    const notifications = notificationsForPuzzleChange(puzzleWithComment, withReplies, 'second-puzzle');
    expect(notifications.length).toEqual(2);
    for (const notification of notifications) {
      await adminApp.firestore().collection('n').doc(notification.id).set(notification);
    }

    return withMockedDate(async () => {

      await queueEmails();

      const mail2 = await adminApp.firestore().collection('mail').get();
      expect(mail2.size).toEqual(2);
      expect(mail2.docs.map(d => d.data()).sort((a, b) => a.to[0].localeCompare(b.to[0]))).toMatchSnapshot();
    });
  });
});
