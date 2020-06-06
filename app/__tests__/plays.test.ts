import { anonymousUser } from '../lib/testingUtils';
import { setApp, TimestampClass } from '../lib/firebaseWrapper';
import * as firebaseTesting from '@firebase/testing';
import { PlayT } from '../lib/dbtypes';
import { getPlays, TimestampedPlayMapT } from '../lib/plays';

let adminApp: firebase.app.App;
let app: firebase.app.App;
let loggedInApp: firebase.app.App;

let play1: PlayT;
let play2: PlayT;

jest.mock('../lib/firebaseWrapper');

const TEST_DB = 'playtest';

beforeAll(async () => {
  adminApp = firebaseTesting.initializeAdminApp({ projectId: TEST_DB }) as firebase.app.App;
  app = firebaseTesting.initializeTestApp({ projectId: TEST_DB }) as firebase.app.App;
  loggedInApp = firebaseTesting.initializeTestApp({
    projectId: TEST_DB,
    auth: {
      uid: 'anonymous-user-id', admin: false, firebase: {
        sign_in_provider: 'anonymous'
      }
    }
  }) as firebase.app.App;

  const thirtyAgo = new Date();
  thirtyAgo.setMinutes(thirtyAgo.getMinutes() - 30);
  const twentyAgo = new Date();
  twentyAgo.setMinutes(twentyAgo.getMinutes() - 20);

  play1 = {
    c: 'foobar',
    u: 'anonymous-user-id',
    ua: TimestampClass.fromDate(twentyAgo),
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

  play2 = {
    c: 'mike',
    u: 'anonymous-user-id',
    ua: TimestampClass.fromDate(thirtyAgo),
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

  const play3 = {
    c: 'mike',
    u: 'other-user-id',
    ua: TimestampClass.fromDate(twentyAgo),
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
  await adminApp.firestore().collection('p').doc('mike-other-user-id').set(play3);
});

afterAll(async () => {
  await app.delete();
  await adminApp.delete();
  await loggedInApp.delete();
});

test('get plays for logged out', async () => {
  setApp(app);

  expect(await getPlays(undefined)).toEqual({});

  const fifteenAgo = new Date();
  fifteenAgo.setMinutes(fifteenAgo.getMinutes() - 15);
  const forLS: TimestampedPlayMapT = {
    downloadedAt: TimestampClass.fromDate(fifteenAgo),
    data: { [play1.c]: play1 }
  };
  window.localStorage.setItem('plays/logged-out', JSON.stringify(forLS));

  expect(await getPlays(undefined)).toHaveProperty(play1.c, play1);
});

test('get 2 plays for logged in', async () => {
  setApp(loggedInApp);

  expect(await getPlays(anonymousUser)).toEqual({ [play1.c]: play1, [play2.c]: play2 });
});

test('get 2 updated plays for logged in if past expiration', async () => {
  setApp(loggedInApp);

  const longAgo = new Date();
  longAgo.setMinutes(longAgo.getMinutes() - 60);
  const forLS: TimestampedPlayMapT = {
    downloadedAt: TimestampClass.fromDate(longAgo),
    data: {}
  };
  window.localStorage.setItem('plays/' + anonymousUser.uid, JSON.stringify(forLS));

  expect(await getPlays(anonymousUser)).toEqual({ [play1.c]: play1, [play2.c]: play2 });
});

test('get 0 updated plays for logged in if results still valid', async () => {
  setApp(loggedInApp);

  const justNow = new Date();
  justNow.setMinutes(justNow.getMinutes() - 2);
  const forLS: TimestampedPlayMapT = {
    downloadedAt: TimestampClass.fromDate(justNow),
    data: {}
  };
  window.localStorage.setItem('plays/' + anonymousUser.uid, JSON.stringify(forLS));

  expect(await getPlays(anonymousUser)).toEqual({});
});

test('get 1 play for logged in', async () => {
  setApp(loggedInApp);

  const twentyFiveAgo = new Date();
  twentyFiveAgo.setMinutes(twentyFiveAgo.getMinutes() - 25);
  const forLS: TimestampedPlayMapT = {
    downloadedAt: TimestampClass.fromDate(twentyFiveAgo),
    data: {}
  };
  window.localStorage.setItem('plays/' + anonymousUser.uid, JSON.stringify(forLS));

  expect(await getPlays(anonymousUser)).toEqual({ [play1.c]: play1 });
});

test('get 0 plays for logged in', async () => {
  setApp(loggedInApp);

  const fifteenAgo = new Date();
  fifteenAgo.setMinutes(fifteenAgo.getMinutes() - 15);
  const forLS: TimestampedPlayMapT = {
    downloadedAt: TimestampClass.fromDate(fifteenAgo),
    data: {}
  };
  window.localStorage.setItem('plays/' + anonymousUser.uid, JSON.stringify(forLS));

  expect(await getPlays(anonymousUser)).toEqual({});
});

test('get merge plays for logged in', async () => {
  setApp(loggedInApp);

  const fifteenAgo = new Date();
  fifteenAgo.setMinutes(fifteenAgo.getMinutes() - 15);
  const forLS: TimestampedPlayMapT = {
    downloadedAt: TimestampClass.fromDate(fifteenAgo),
    data: { [play1.c]: play1 }
  };
  window.localStorage.setItem('plays/' + anonymousUser.uid, JSON.stringify(forLS));

  expect(await getPlays(anonymousUser)).toEqual({ [play1.c]: play1 });
});
