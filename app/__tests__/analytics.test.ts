import { TimestampClass } from '../lib/firebaseWrapper';
import * as firebaseTesting from '@firebase/testing';
import { PlayT, LegacyPlayT, DBPuzzleT } from '../lib/dbtypes';
import { runAnalytics } from '../lib/analytics';

let adminApp: firebase.app.App;

let play1: PlayT;
let play2: LegacyPlayT;
let play3: LegacyPlayT;

jest.mock('../lib/firebaseWrapper');

const projectId = 'analyticstest';

beforeAll(async () => {
  adminApp = firebaseTesting.initializeAdminApp({ projectId }) as firebase.app.App;
});

beforeEach(async () => {
  await firebaseTesting.clearFirestoreData({ projectId });

  const thirtyAgo = new Date();
  thirtyAgo.setMinutes(thirtyAgo.getMinutes() - 30);
  const twentyAgo = new Date();
  twentyAgo.setMinutes(twentyAgo.getMinutes() - 20);

  play1 = {
    c: 'mike',
    u: 'blah',
    ua: TimestampClass.fromDate(twentyAgo),
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
    n: 'Puzzle title'
  };
  await adminApp.firestore().collection('p').doc('mike-blah').set(play1);

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
    f: true,
  };
  await adminApp.firestore().collection('p').doc('mike-anonymous-user-id').set(play2);
  // Since play2 is a LegacyPlayT, getPlays() will look up the puzzle to get a title
  const puzzle: DBPuzzleT = {
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
    p: TimestampClass.fromDate(new Date('6/10/2020')),
    a: 'fSEwJorvqOMK5UhNMHa4mu48izl1',
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
  await adminApp.firestore().collection('c').doc('mike').set(puzzle);

  play3 = {
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
    f: true
  };
  await adminApp.firestore().collection('p').doc('mike-other-user-id').set(play3);
});

afterAll(async () => {
  await adminApp.delete();
});

test('run for all time w/o initial state', async () => {
  const hourAgo = new Date();
  hourAgo.setMinutes(hourAgo.getMinutes() - 60);

  await runAnalytics(adminApp.firestore(), TimestampClass.fromDate(hourAgo), TimestampClass.fromDate(new Date()));

  const res = await adminApp.firestore().collection('ds').get();
  expect(res.size).toEqual(1);
  // Can't snapshot updatedAt or playcount by hour
  const { ua, h, ...toSnapshot } = res.docs[0].data();
  expect(ua).not.toBeFalsy();
  expect(h.length).toEqual(24);
  expect(toSnapshot).toMatchSnapshot();

  const pres = await adminApp.firestore().collection('s').doc('mike').get();
  const data = pres.data();
  if (data === undefined) {
    throw new Error('botch');
  }
  const { ua: pua, ...pToSnapshot } = data;
  expect(pua).not.toBeFalsy();
  expect(pToSnapshot).toMatchSnapshot();
});

test('run for more recent w/o initial state', async () => {
  const twentyFive = new Date();
  twentyFive.setMinutes(twentyFive.getMinutes() - 25);

  await runAnalytics(adminApp.firestore(), TimestampClass.fromDate(twentyFive), TimestampClass.fromDate(new Date()));

  const res = await adminApp.firestore().collection('ds').get();
  expect(res.size).toEqual(1);
  // Can't snapshot updatedAt or playcount by hour
  const { ua, h, ...toSnapshot } = res.docs[0].data();
  expect(ua).not.toBeFalsy();
  expect(h.length).toEqual(24);
  expect(toSnapshot).toMatchSnapshot();

  const pres = await adminApp.firestore().collection('s').doc('mike').get();
  const data = pres.data();
  if (data === undefined) {
    throw new Error('botch');
  }
  const { ua: pua, ...pToSnapshot } = data;
  expect(pua).not.toBeFalsy();
  expect(pToSnapshot).toMatchSnapshot();
});
