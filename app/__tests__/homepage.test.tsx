import { render } from '../lib/testingUtils';
import { setApp, TimestampClass } from '../lib/firebaseWrapper';
import * as firebaseTesting from '@firebase/testing';
import { DBPuzzleT, getDateString } from '../lib/dbtypes';
import HomePage, { getServerSideProps } from '../pages/index';

let adminApp: firebase.app.App;
let app: firebase.app.App;

let dailymini: DBPuzzleT;
const dailyminiId = 'dailymini';
let featuredPuzzle: DBPuzzleT;
const featuredId = 'published-puzzle';
let nonFeaturedPuzzle: DBPuzzleT;
const nonFeaturedId = 'pending-puzzle';

jest.mock('../lib/firebaseWrapper');

const TEST_DB = 'homepagetest';

beforeAll(async () => {
  adminApp = firebaseTesting.initializeAdminApp({ projectId: TEST_DB }) as firebase.app.App;
  app = firebaseTesting.initializeTestApp({ projectId: TEST_DB }) as firebase.app.App;

  const hourAgo = new Date();
  hourAgo.setMinutes(hourAgo.getMinutes() - 60);
  const hourFromNow = new Date();
  hourFromNow.setMinutes(hourFromNow.getMinutes() + 60);

  dailymini = {
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
  await adminApp.firestore().collection('c').doc(dailyminiId).set(dailymini);
  await adminApp.firestore().collection('categories').doc('dailymini').set({ [getDateString(new Date())]: dailyminiId });

  featuredPuzzle = {
    c: null,
    m: true,
    f: true,
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
  await adminApp.firestore().collection('c').doc(featuredId).set(featuredPuzzle);

  nonFeaturedPuzzle = {
    c: null,
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
  await adminApp.firestore().collection('c').doc(nonFeaturedId).set(nonFeaturedPuzzle);
});

afterAll(async () => {
  await adminApp.delete();
  await app.delete();
});

test('get home page', async () => {
  setApp(app);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const props = await getServerSideProps({ res: { setHeader: jest.fn() } } as any);
  const r = render(<HomePage {...props.props} />, {});
  expect(r.container).toMatchSnapshot();
});
