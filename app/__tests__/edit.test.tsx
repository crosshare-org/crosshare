import * as firebaseTesting from '@firebase/testing';
import { setApp, setAdminApp } from '../lib/firebaseWrapper';
import type * as firebaseAdminType from 'firebase-admin';
import { getUser, render, getMockedPuzzle, fireEvent } from '../lib/testingUtils';
import { PuzzleLoader } from '../pages/crosswords/[puzzleId]/edit';

jest.mock('../lib/firebaseWrapper');
jest.mock('../lib/WordDB');

afterEach(() => {
  jest.clearAllMocks();
});

let randoApp: firebase.app.App, app: firebase.app.App, admin: firebase.app.App;

const PUZZLEID = 'foobar';

beforeAll(async () => {
  randoApp = firebaseTesting.initializeTestApp({
    projectId,
    auth: {
      uid: 'tom', admin: false, firebase: {
        sign_in_provider: 'google'
      }
    }
  }) as firebase.app.App;
  app = firebaseTesting.initializeTestApp({
    projectId,
    auth: {
      uid: 'mike', admin: false, firebase: {
        sign_in_provider: 'google'
      }
    }
  }) as firebase.app.App;
  admin = firebaseTesting.initializeAdminApp({ projectId }) as firebase.app.App;
  setAdminApp(admin as unknown as firebaseAdminType.app.App);
});

afterAll(async () => {
  await app.delete();
  await admin.delete();
  await randoApp.delete();
});

const mike = getUser('mike', false);
const rando = getUser('tom', false);
const projectId = 'edit-test';

test('cannot edit if not correct user', async () => {
  sessionStorage.clear();
  localStorage.clear();

  await firebaseTesting.clearFirestoreData({ projectId });
  await admin.firestore().collection('c').doc(PUZZLEID).set(getMockedPuzzle({ a: 'mike' }));

  setApp(randoApp);

  const r = render(
    <PuzzleLoader puzzleId={PUZZLEID} auth={{ user: rando, isAdmin: false }} />, { user: rando }
  );

  expect(await r.findByText('You do not have permission to view this page', { exact: false })).toBeInTheDocument();
});

test('basic edit', async () => {
  sessionStorage.clear();
  localStorage.clear();

  await firebaseTesting.clearFirestoreData({ projectId });
  await admin.firestore().collection('c').doc(PUZZLEID).set(getMockedPuzzle({ a: 'mike' }));

  setApp(app);

  const r = render(
    <PuzzleLoader puzzleId={PUZZLEID} auth={{ user: mike, isAdmin: false }} />, { user: mike }
  );

  expect(await r.findByText('changes may take up to an hour', { exact: false })).toBeInTheDocument();
  fireEvent.click((await r.findAllByText('edit'))[3]);
  fireEvent.change(r.getByLabelText('ESSAY'), { target: { value: 'A new clue for essay' } });
  fireEvent.click(r.getByText('Save'));

  expect(await r.findByText('A new clue for essay')).toBeInTheDocument();
  const res = await admin.firestore().collection('c').doc(PUZZLEID).get();
  const resData = res.data();
  if (!resData) {
    throw new Error('botch');
  }
  delete resData['p'];
  delete resData['cs'][0]['p'];
  expect(resData).toMatchSnapshot();

  fireEvent.click((await r.findAllByText('edit'))[7]);
  fireEvent.change(r.getByLabelText('SETSA'), { target: { value: 'A new clue for wedding' } });
  fireEvent.click(r.getByText('Save'));
  expect(await r.findByText('A new clue for wedding')).toBeInTheDocument();

  const res2 = await admin.firestore().collection('c').doc(PUZZLEID).get();
  const resData2 = res2.data();
  if (!resData2) {
    throw new Error('botch');
  }
  delete resData2['p'];
  delete resData2['cs'][0]['p'];
  expect(resData2).toMatchSnapshot();
});

test('security rules for puzzle edits', async () => {
  await firebaseTesting.clearFirestoreData({ projectId });
  await admin.firestore().collection('c').doc(PUZZLEID).set(getMockedPuzzle({ a: 'mike' }));
  await admin.firestore().collection('c').doc('other').set(getMockedPuzzle({ a: 'other' }));

  // Succeeds updating title
  await firebaseTesting.assertSucceeds(
    app.firestore().collection('c').doc(PUZZLEID).update({
      t: 'Here is a new title',
    })
  );

  // Succeeds updating clues
  const downs = getMockedPuzzle()['dc'];
  downs[2] = 'My new clue here';
  await firebaseTesting.assertSucceeds(
    app.firestore().collection('c').doc(PUZZLEID).update({
      dc: downs,
    })
  );

  // Fails for other user
  await firebaseTesting.assertFails(
    app.firestore().collection('c').doc('other').update({
      t: 'Here is a new title',
    })
  );

  // Fails for clues wrong length
  await firebaseTesting.assertFails(
    app.firestore().collection('c').doc(PUZZLEID).update({
      dc: downs.slice(0, -1)
    })
  );

  // Fails for setting featured
  await firebaseTesting.assertFails(
    app.firestore().collection('c').doc(PUZZLEID).update({
      f: true
    })
  );

  // Fails for setting moderated
  await firebaseTesting.assertFails(
    app.firestore().collection('c').doc(PUZZLEID).update({
      m: true
    })
  );

  // Fails for modifying grid
  const grid = getMockedPuzzle()['g'];
  grid[2] = 'M';
  await firebaseTesting.assertFails(
    app.firestore().collection('c').doc(PUZZLEID).update({
      g: grid,
    })
  );
});
