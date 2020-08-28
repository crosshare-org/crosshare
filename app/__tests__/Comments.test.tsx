import { Comments } from '../components/Comments';
import { render } from '../lib/testingUtils';
import { Comment } from '../lib/types';
import { setApp } from '../lib/firebaseWrapper';
import * as firebaseTesting from '@firebase/testing';

jest.mock('../lib/firebaseWrapper');

const testComment: Comment = {
  id: 'comment-id',
  commentText: 'my first comment',
  authorId: 'comment-author-id',
  authorDisplayName: 'Mike D',
  authorSolveTime: 55.4,
  authorCheated: false,
  publishTime: new Date().getTime(),
};

test('basic comment display', () => {
  setApp(
    firebaseTesting.initializeTestApp({
      projectId: 'test1',
    }) as firebase.app.App
  );
  const { getByText, container } = render(
    <Comments
      solveTime={10}
      didCheat={false}
      puzzleId="puzz"
      puzzleAuthorId="puzzAuthor"
      comments={[testComment]}
    />,
    {}
  );
  expect(getByText(/my first comment/i)).toBeVisible();
  expect(container.firstChild).toMatchSnapshot();
});

test('comment with username display', () => {
  setApp(
    firebaseTesting.initializeTestApp({
      projectId: 'test1',
    }) as firebase.app.App
  );
  const { getByText, container } = render(
    <Comments
      solveTime={10}
      didCheat={false}
      puzzleId="puzz"
      puzzleAuthorId="puzzAuthor"
      comments={[{ authorUsername: 'MikeD', ...testComment }]}
    />,
    {}
  );
  expect(getByText(/my first comment/i)).toBeVisible();
  expect(container.firstChild).toMatchSnapshot();
});

test('security rules should only allow commenting as onesself', async () => {
  const app = firebaseTesting.initializeTestApp({
    projectId: 'mdcrosshare',
    auth: {
      uid: 'mike',
      admin: false,
      firebase: {
        sign_in_provider: 'google.com',
      },
    },
  });

  await firebaseTesting.assertFails(
    app.firestore().collection('cfm').add({ c: 'comment text' })
  );
  await firebaseTesting.assertFails(
    app.firestore().collection('cfm').add({ c: 'comment text', a: 'jared' })
  );
  await firebaseTesting.assertSucceeds(
    app.firestore().collection('cfm').add({ c: 'comment text', a: 'mike' })
  );
  app.delete();
});

test('security rules should only allow commenting with username if it matches your account', async () => {
  const adminApp = firebaseTesting.initializeAdminApp({ projectId: 'mdcrosshare' }) as firebase.app.App;
  await adminApp.firestore().collection('cp').doc('miked').set({ u: 'mike' });
  await adminApp.firestore().collection('cp').doc('rando').set({ u: 'rando' });
  adminApp.delete();

  const app = firebaseTesting.initializeTestApp({
    projectId: 'mdcrosshare',
    auth: {
      uid: 'mike',
      admin: false,
      firebase: {
        sign_in_provider: 'google.com',
      },
    },
  });



  await firebaseTesting.assertSucceeds(
    app.firestore().collection('cfm').add({ c: 'comment text', a: 'mike' })
  );
  await firebaseTesting.assertSucceeds(
    app.firestore().collection('cfm').add({ c: 'comment text', a: 'mike', un: 'miked' })
  );
  await firebaseTesting.assertSucceeds(
    app.firestore().collection('cfm').add({ c: 'comment text', a: 'mike', un: 'MikeD' })
  );
  await firebaseTesting.assertFails(
    app.firestore().collection('cfm').add({ c: 'comment text', a: 'mike', un: 'rando' })
  );
  await firebaseTesting.assertFails(
    app.firestore().collection('cfm').add({ c: 'comment text', a: 'mike', un: 'totalblast' })
  );
  app.delete();
});

test('security rules should only allow commenting if non-anonymous', async () => {
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
    app.firestore().collection('cfm').add({ c: 'comment text' })
  );
  await firebaseTesting.assertFails(
    app.firestore().collection('cfm').add({ c: 'comment text', a: 'jared' })
  );
  await firebaseTesting.assertFails(
    app.firestore().collection('cfm').add({ c: 'comment text', a: 'mike' })
  );
  app.delete();
});
