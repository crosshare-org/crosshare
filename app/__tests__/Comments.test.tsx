import { Comments } from '../components/Comments';
import { render } from '../lib/testingUtils';
import { Comment } from '../lib/types';
import { setApp } from '../lib/firebaseWrapper';
import * as firebaseTesting from '@firebase/rules-unit-testing';
import MockDate from 'mockdate';

jest.mock('../lib/firebaseWrapper');

const projectId = 'comments-test';
const adminApp = firebaseTesting.initializeAdminApp({ projectId });
const app = firebaseTesting.initializeTestApp({ projectId });

beforeAll(() => {
  MockDate.set(new Date(Date.UTC(2020, 7, 2, 7)));
});
beforeEach(async () => {
  await firebaseTesting.clearFirestoreData({ projectId });
});
afterAll(async () => {
  MockDate.reset();
  await Promise.all(firebaseTesting.apps().map((app) => app.delete()));
});

const testComment: Comment = {
  id: 'comment-id',
  commentText: 'my first comment',
  authorId: 'comment-author-id',
  authorDisplayName: 'Mike D',
  authorSolveTime: 55.4,
  authorCheated: false,
  authorSolvedDownsOnly: false,
  authorIsPatron: false,
  publishTime: new Date(Date.UTC(2020, 7, 1, 7)).getTime(),
};

test('basic comment display', () => {
  setApp(app);
  const { getByText, container } = render(
    <Comments
      clueMap={new Map()}
      solveTime={10}
      didCheat={false}
      downsOnly={false}
      puzzleId="puzz"
      puzzleAuthorId="puzzAuthor"
      hasGuestConstructor={false}
      puzzlePublishTime={new Date(Date.UTC(2020, 5, 1, 7)).getTime()}
      comments={[testComment]}
    />,
    {}
  );
  expect(getByText(/my first comment/i)).toBeVisible();
  expect(container.firstChild).toMatchSnapshot();
});

test('comment with username display', () => {
  setApp(app);
  const { getByText, container } = render(
    <Comments
      clueMap={new Map()}
      solveTime={10}
      didCheat={false}
      downsOnly={false}
      puzzleId="puzz"
      puzzleAuthorId="puzzAuthor"
      hasGuestConstructor={false}
      puzzlePublishTime={new Date(Date.UTC(2020, 5, 1, 7)).getTime()}
      comments={[{ authorUsername: 'MikeD', ...testComment }]}
    />,
    {}
  );
  expect(getByText(/my first comment/i)).toBeVisible();
  expect(container.firstChild).toMatchSnapshot();
});

test('security rules should only allow commenting as onesself', async () => {
  const app = firebaseTesting.initializeTestApp({
    projectId,
    auth: {
      uid: 'mike',
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
});

test('security rules should only allow commenting with username if it matches your account', async () => {
  await adminApp.firestore().collection('cp').doc('miked').set({ u: 'mike' });
  await adminApp.firestore().collection('cp').doc('rando').set({ u: 'rando' });

  const app = firebaseTesting.initializeTestApp({
    projectId,
    auth: {
      uid: 'mike',
      firebase: {
        sign_in_provider: 'google.com',
      },
    },
  });

  await firebaseTesting.assertSucceeds(
    app.firestore().collection('cfm').add({ c: 'comment text', a: 'mike' })
  );
  await firebaseTesting.assertSucceeds(
    app
      .firestore()
      .collection('cfm')
      .add({ c: 'comment text', a: 'mike', un: 'miked' })
  );
  await firebaseTesting.assertSucceeds(
    app
      .firestore()
      .collection('cfm')
      .add({ c: 'comment text', a: 'mike', un: 'MikeD' })
  );
  await firebaseTesting.assertFails(
    app
      .firestore()
      .collection('cfm')
      .add({ c: 'comment text', a: 'mike', un: 'rando' })
  );
  await firebaseTesting.assertFails(
    app
      .firestore()
      .collection('cfm')
      .add({ c: 'comment text', a: 'mike', un: 'totalblast' })
  );
});

test('security rules should only allow commenting if non-anonymous', async () => {
  const app = firebaseTesting.initializeTestApp({
    projectId,
    auth: {
      uid: 'mike',
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
});
