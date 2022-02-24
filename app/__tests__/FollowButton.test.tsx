import * as firebaseTesting from '@firebase/rules-unit-testing';

import { setApp } from '../lib/firebaseWrapper';
import {
  fireEvent,
  render,
  getUser,
  renderWithSnackbar,
} from '../lib/testingUtils';
import { FollowButton } from '../components/FollowButton';
jest.mock('../lib/firebaseWrapper');
import type firebase from 'firebase/compat/app';
import type firebaseAdminType from 'firebase-admin';

import { ConstructorPageT } from '../lib/constructorPage';

const projectId = 'followtests';
let adminApp: firebaseAdminType.app.App;

beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  adminApp = firebaseTesting.initializeAdminApp({ projectId });
});

afterAll(() => {
  Promise.all(firebaseTesting.apps().map((app) => app.delete()));
});

test('follow button logged out', async () => {
  await firebaseTesting.clearFirestoreData({ projectId });

  const page: ConstructorPageT = {
    id: 'foobar',
    b: 'Here is our bio',
    i: 'FooBar',
    u: 'blammo',
    n: 'John Doe',
  };

  const r = render(<FollowButton page={page} />, {});
  const b = r.getByText('Follow');
  expect(b).toBeInTheDocument();
  fireEvent.click(b);
  await r.findByText('Login with Google to follow', undefined, {
    timeout: 3000,
  });
});

const mike = getUser('mike', false);

test('follow button logged in', async () => {
  await firebaseTesting.clearFirestoreData({ projectId });

  const app = firebaseTesting.initializeTestApp({
    projectId,
    auth: {
      uid: 'mike',
      firebase: {
        sign_in_provider: 'google.com',
      },
    },
  }) as firebase.app.App;
  setApp(app);

  const page: ConstructorPageT = {
    id: 'foobar',
    b: 'Here is our bio',
    i: 'FooBar',
    u: 'blammo',
    n: 'John Doe',
  };

  const r = renderWithSnackbar(<FollowButton page={page} />, { user: mike });
  const b = r.getByText('Follow');
  expect(b).toBeInTheDocument();
  fireEvent.click(b);
  await r.findByText(/notified when John Doe posts/, undefined, {
    timeout: 3000,
  });

  const prefs = await adminApp.firestore().doc('prefs/mike').get();
  expect(prefs.data()?.following).toContain('blammo');
  const followers = await adminApp.firestore().doc('followers/blammo').get();
  expect(followers.data()?.f).toContain('mike');
  await adminApp.delete();
  await app.delete();
});
