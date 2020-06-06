import React from 'react';
import { anonymousUser, render } from '../lib/testingUtils';
import CategoryPage, { propsForCategoryId } from '../pages/categories/[categoryId]';
import { setApp, TimestampClass } from '../lib/firebaseWrapper';
import * as firebaseTesting from '@firebase/testing';
import { PlayT, CategoryIndexT } from '../lib/dbtypes';

let adminApp: firebase.app.App;
let app: firebase.app.App;
let loggedInApp: firebase.app.App;

jest.mock('../lib/firebaseWrapper');

beforeAll(async () => {
  adminApp = firebaseTesting.initializeAdminApp({ projectId: 'categorytest' }) as firebase.app.App;
  app = firebaseTesting.initializeTestApp({ projectId: 'categorytest' }) as firebase.app.App;
  loggedInApp = firebaseTesting.initializeTestApp({
    projectId: 'categorytest',
    auth: {
      uid: 'anonymous-user-id', admin: false, firebase: {
        sign_in_provider: 'anonymous'
      }
    }
  }) as firebase.app.App;
  setApp(app);

  const dailymini: CategoryIndexT = {
    '2020-4-10': 'foobar',
    '2020-4-1': 'baz',
    '2020-4-5': 'mike'
  };
  await adminApp.firestore().collection('categories').doc('dailymini').set(dailymini);

  const play1: PlayT = {
    c: 'foobar',
    u: 'anonymous-user-id',
    ua: TimestampClass.now(),
    g: [],
    ct: [],
    uc: [],
    vc: [],
    wc: [],
    we: [],
    rc: [],
    t: 70,
    ch: false,
    f: true
  };
  await adminApp.firestore().collection('p').doc('foobar-anonymous-user-id').set(play1);

  const play2: PlayT = {
    c: 'mike',
    u: 'anonymous-user-id',
    ua: TimestampClass.now(),
    g: [],
    ct: [],
    uc: [],
    vc: [],
    wc: [],
    we: [],
    rc: [],
    t: 44,
    ch: false,
    f: false
  };
  await adminApp.firestore().collection('p').doc('mike-anonymous-user-id').set(play2);
});

afterAll(async () => {
  await app.delete();
  await adminApp.delete();
  await loggedInApp.delete();
});

test('basic category page test', async () => {
  const props = await propsForCategoryId('dailymini');
  const { findByText, container } = render(<CategoryPage {...props} />, {});

  const link = await findByText('Daily Mini for 5/10/2020');
  expect(link).toBeInTheDocument();
  expect(link).toHaveAttribute('href', '/crosswords/foobar');
  expect(container).toMatchSnapshot();
});

test('category page when logged in with some plays', async () => {
  setApp(loggedInApp);

  const props = await propsForCategoryId('dailymini');
  const { findByText, container } = render(<CategoryPage {...props} />, { user: anonymousUser });

  expect(await findByText(/completed without helpers/)).toBeInTheDocument();
  expect(await findByText(/unfinished/)).toBeInTheDocument();
  expect(container).toMatchSnapshot();

  setApp(app);
});

test('category 404', async () => {
  const props = await propsForCategoryId('dailyfulllength');
  const { getByText } = render(<CategoryPage {...props} />, {});

  expect(getByText(/invalid category/i)).toBeVisible();
});
