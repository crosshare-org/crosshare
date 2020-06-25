import { getUser, render } from '../lib/testingUtils';
import { setApp, TimestampClass } from '../lib/firebaseWrapper';
import * as firebaseTesting from '@firebase/testing';
import { DBPuzzleT } from '../lib/dbtypes';
import { PuzzleLoader } from '../pages/pending/[pendingPuzzleId]';
import NextJSRouter from 'next/router';
import waitForExpect from 'wait-for-expect';

jest.mock('next/router', () => ({ push: jest.fn() }));

let adminApp: firebase.app.App;
let app: firebase.app.App;
let loggedInApp: firebase.app.App;
let loggedInAsAdminApp: firebase.app.App;
let authorApp: firebase.app.App;

let publishedPuzzle: DBPuzzleT;
const publishedId = 'published-puzzle';
let pendingPuzzle: DBPuzzleT;
const pendingId = 'pending-puzzle';

jest.mock('../lib/firebaseWrapper');

const TEST_DB = 'pendingtest';

beforeAll(async () => {
  adminApp = firebaseTesting.initializeAdminApp({ projectId: TEST_DB }) as firebase.app.App;
  app = firebaseTesting.initializeTestApp({ projectId: TEST_DB }) as firebase.app.App;
  loggedInApp = firebaseTesting.initializeTestApp({
    projectId: TEST_DB,
    auth: {
      uid: 'rando', admin: false, firebase: {
        sign_in_provider: 'google'
      }
    }
  }) as firebase.app.App;
  loggedInAsAdminApp = firebaseTesting.initializeTestApp({
    projectId: TEST_DB,
    auth: {
      uid: 'miked', admin: true, firebase: {
        sign_in_provider: 'google'
      }
    }
  }) as firebase.app.App;
  authorApp = firebaseTesting.initializeTestApp({
    projectId: TEST_DB,
    auth: {
      uid: 'puzzleauthor', admin: false, firebase: {
        sign_in_provider: 'google'
      }
    }
  }) as firebase.app.App;

  const hourAgo = new Date();
  hourAgo.setMinutes(hourAgo.getMinutes() - 60);
  const hourFromNow = new Date();
  hourFromNow.setMinutes(hourFromNow.getMinutes() + 60);

  publishedPuzzle = {
    c: 'dailymini',
    m: true,
    t: 'Raises, as young',
    dn: [1, 2, 3, 4, 5],
    ac:
      [' Cobbler\'s forms',
        'Absolutely perfect',
        'Spike Lee\'s "She\'s ___ Have It"',
        'English class assignment',
        'Raises, as young'],
    dc:
      ['Hybrid whose father is a lion',
        '___ of reality (wake-up call)',
        '___ date (makes wedding plans)',
        'Middle Ages invader',
        'Has a great night at the comedy club'],
    p: TimestampClass.fromDate(hourAgo),
    a: 'puzzleauthor',
    ca: TimestampClass.now(),
    an: [1, 6, 7, 8, 9],
    g:
      ['L',
        'A',
        'S',
        'T',
        'S',
        'I',
        'D',
        'E',
        'A',
        'L',
        'G',
        'O',
        'T',
        'T',
        'A',
        'E',
        'S',
        'S',
        'A',
        'Y',
        'R',
        'E',
        'A',
        'R',
        'S'],
    h: 5,
    w: 5,
    cs:
      [{
        c:
          'A couple of two-worders today which I don\'t love, but I hope you all got it anyway!',
        i: 'LwgoVx0BAskM4wVJyoLj',
        t: 36.009,
        p: TimestampClass.now(),
        a: 'fSEwJorvqOMK5UhNMHa4mu48izl1',
        n: 'Mike D',
        ch: false,
      }],
    n: 'Mike D'
  };
  await adminApp.firestore().collection('c').doc(publishedId).set(publishedPuzzle);

  pendingPuzzle = {
    c: 'dailymini',
    m: true,
    t: 'Raises, as young',
    dn: [1, 2, 3, 4, 5],
    ac:
      [' Cobbler\'s forms',
        'Absolutely perfect',
        'Spike Lee\'s "She\'s ___ Have It"',
        'English class assignment',
        'Raises, as young'],
    dc:
      ['Hybrid whose father is a lion',
        '___ of reality (wake-up call)',
        '___ date (makes wedding plans)',
        'Middle Ages invader',
        'Has a great night at the comedy club'],
    p: TimestampClass.fromDate(hourFromNow),
    a: 'puzzleauthor',
    ca: TimestampClass.now(),
    an: [1, 6, 7, 8, 9],
    g:
      ['L',
        'A',
        'S',
        'T',
        'S',
        'I',
        'D',
        'E',
        'A',
        'L',
        'G',
        'O',
        'T',
        'T',
        'A',
        'E',
        'S',
        'S',
        'A',
        'Y',
        'R',
        'E',
        'A',
        'R',
        'S'],
    h: 5,
    w: 5,
    cs:
      [{
        c:
          'A couple of two-worders today which I don\'t love, but I hope you all got it anyway!',
        i: 'LwgoVx0BAskM4wVJyoLj',
        t: 36.009,
        p: TimestampClass.now(),
        a: 'fSEwJorvqOMK5UhNMHa4mu48izl1',
        n: 'Mike D',
        ch: false,
      }],
    n: 'Mike D'
  };
  await adminApp.firestore().collection('c').doc(pendingId).set(pendingPuzzle);
});

afterAll(async () => {
  await adminApp.delete();
  await app.delete();
  await loggedInApp.delete();
  await loggedInAsAdminApp.delete();
  await authorApp.delete();
});

test('published page redirects for user but non-admin/author', async () => {
  setApp(loggedInApp);

  render(<PuzzleLoader puzzleId={publishedId} />, { user: getUser('rando', false) });
  await waitForExpect(async () => expect(NextJSRouter.push).toHaveBeenCalledWith('/crosswords/' + publishedId));
});

test('published page redirects for non user', async () => {
  setApp(app);

  render(<PuzzleLoader puzzleId={publishedId} />, {});
  await waitForExpect(async () => expect(NextJSRouter.push).toHaveBeenCalledWith('/crosswords/' + publishedId));
});

test('published page redirects for admin', async () => {
  setApp(loggedInAsAdminApp);

  render(<PuzzleLoader puzzleId={publishedId} />, { user: getUser('miked', false), isAdmin: true });
  await waitForExpect(async () => expect(NextJSRouter.push).toHaveBeenCalledWith('/crosswords/' + publishedId));
});

test('published page redirects for author', async () => {
  setApp(authorApp);

  render(<PuzzleLoader puzzleId={publishedId} />, { user: getUser('puzzleauthor', false) });
  await waitForExpect(async () => expect(NextJSRouter.push).toHaveBeenCalledWith('/crosswords/' + publishedId));
});

test('pending page errors for user but non-admin/author', async () => {
  setApp(loggedInApp);

  const r = render(<PuzzleLoader puzzleId={pendingId} />, { user: getUser('rando', false) });

  await r.findByText(/error loading puzzle/i);
});

test('pending page errors for non user', async () => {
  setApp(app);

  const r = render(<PuzzleLoader puzzleId={pendingId} />, {});

  await r.findByText(/error loading puzzle/i);
});

test('pending page displays puzzle for admin', async () => {
  setApp(loggedInAsAdminApp);

  const r = render(<PuzzleLoader puzzleId={pendingId} />, { user: getUser('miked', false), isAdmin: true });

  await r.findByText(/visible to others yet/i);
});

test('pending page displays puzzle for author', async () => {
  setApp(authorApp);

  const r = render(<PuzzleLoader puzzleId={pendingId} />, { user: getUser('puzzleauthor', false) });

  await r.findByText(/visible to others yet/i);
});
