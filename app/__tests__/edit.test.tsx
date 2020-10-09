import * as firebaseTesting from '@firebase/rules-unit-testing';
import { setApp, setAdminApp } from '../lib/firebaseWrapper';
import type * as firebaseAdminType from 'firebase-admin';
import { getUser, screen, render, getMockedPuzzle, fireEvent, waitForElementToBeRemoved } from '../lib/testingUtils';
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
  fireEvent.click(r.getByTitle('Edit ESSAY'));
  fireEvent.change(r.getByLabelText('ESSAY'), { target: { value: 'A new clue for essay' } });
  fireEvent.click(r.getByText('Save'));
  await waitForElementToBeRemoved(() => screen.getByText('Save'));

  expect(r.getByText('A new clue for essay')).toBeInTheDocument();
  await checkSnapshot(PUZZLEID);

  fireEvent.click(r.getByTitle('Edit SETSA'));
  fireEvent.change(r.getByLabelText('SETSA'), { target: { value: 'A new clue for wedding' } });
  fireEvent.click(r.getByText('Save'));
  await waitForElementToBeRemoved(() => screen.getByText('Save'));

  expect(r.getByText('A new clue for wedding')).toBeInTheDocument();
  await checkSnapshot(PUZZLEID);
});

test('edit title', async () => {
  sessionStorage.clear();
  localStorage.clear();

  await firebaseTesting.clearFirestoreData({ projectId });
  await admin.firestore().collection('c').doc(PUZZLEID).set(getMockedPuzzle({ a: 'mike' }));

  setApp(app);

  const r = render(
    <PuzzleLoader puzzleId={PUZZLEID} auth={{ user: mike, isAdmin: false }} />, { user: mike }
  );

  expect(await r.findByText('changes may take up to an hour', { exact: false })).toBeInTheDocument();
  fireEvent.click(r.getByTitle('Edit Title'));
  fireEvent.change(r.getByPlaceholderText('Enter Title'), { target: { value: 'Well we got a new title' } });
  fireEvent.click(r.getByText('Save'));
  await waitForElementToBeRemoved(() => screen.getByText('Save'));

  expect(r.getByText('Well we got a new title')).toBeInTheDocument();
  await checkSnapshot(PUZZLEID);
});

async function checkSnapshot(puzzleId: string) {
  const res = await admin.firestore().collection('c').doc(puzzleId).get();
  const resData = res.data();
  if (!resData) {
    throw new Error('botch');
  }
  delete resData['p'];
  delete resData['cs'][0]['p'];
  expect(resData).toMatchSnapshot();
}

test('edit constructor note', async () => {
  sessionStorage.clear();
  localStorage.clear();

  await firebaseTesting.clearFirestoreData({ projectId });
  await admin.firestore().collection('c').doc(PUZZLEID).set(getMockedPuzzle({ a: 'mike' }));

  setApp(app);

  const r = render(
    <PuzzleLoader puzzleId={PUZZLEID} auth={{ user: mike, isAdmin: false }} />, { user: mike }
  );

  expect(await r.findByText('changes may take up to an hour', { exact: false })).toBeInTheDocument();
  fireEvent.click(r.getByTitle('Add Constructor Note'));
  fireEvent.change(r.getByPlaceholderText('Enter Constructor Note'), { target: { value: 'Here is our note' } });
  fireEvent.click(r.getByText('Save'));
  await waitForElementToBeRemoved(() => screen.getByText('Save'));

  expect(r.getByText('Here is our note')).toBeInTheDocument();
  await checkSnapshot(PUZZLEID);

  fireEvent.click(r.getByTitle('Edit Constructor Note'));
  fireEvent.change(r.getByPlaceholderText('Enter Constructor Note'), { target: { value: 'Here is our new note' } });
  fireEvent.click(r.getByText('Save'));
  await waitForElementToBeRemoved(() => screen.getByText('Save'));

  expect(r.getByText('Here is our new note')).toBeInTheDocument();
  expect(r.queryByTitle('Add Constructor Note')).toBeNull();
  await checkSnapshot(PUZZLEID);

  fireEvent.click(r.getByTitle('Delete Constructor Note'));
  await waitForElementToBeRemoved(() => screen.getByTitle('Delete Constructor Note'));

  await checkSnapshot(PUZZLEID);
  expect(r.getByTitle('Add Constructor Note')).toBeInTheDocument();
});

test('edit blog post', async () => {
  sessionStorage.clear();
  localStorage.clear();

  await firebaseTesting.clearFirestoreData({ projectId });
  await admin.firestore().collection('c').doc(PUZZLEID).set(getMockedPuzzle({ a: 'mike' }));

  setApp(app);

  const r = render(
    <PuzzleLoader puzzleId={PUZZLEID} auth={{ user: mike, isAdmin: false }} />, { user: mike }
  );

  expect(await r.findByText('changes may take up to an hour', { exact: false })).toBeInTheDocument();
  fireEvent.click(r.getByTitle('Add Blog Post'));
  fireEvent.change(r.getByPlaceholderText('Enter Blog Post (markdown formatted)'), { target: { value: 'Here is our new blog post' } });
  fireEvent.click(r.getByText('Save'));
  await waitForElementToBeRemoved(() => screen.getByText('Save'));

  expect(r.getByTitle('Edit Blog Post')).toBeInTheDocument();
  expect(r.getByText('Here is our new blog post')).toBeInTheDocument();
  await checkSnapshot(PUZZLEID);

  fireEvent.click(r.getByTitle('Edit Blog Post'));
  fireEvent.change(r.getByPlaceholderText('Enter Blog Post (markdown formatted)'), { target: { value: 'Here is our new post' } });
  fireEvent.click(r.getByText('Save'));
  await waitForElementToBeRemoved(() => screen.getByText('Save'));

  expect(r.getByText('Here is our new post')).toBeInTheDocument();
  expect(r.queryByTitle('Add Blog Post')).toBeNull();
  await checkSnapshot(PUZZLEID);

  fireEvent.click(r.getByTitle('Delete Blog Post'));
  await waitForElementToBeRemoved(() => screen.getByTitle('Delete Blog Post'));
  expect(await r.findByTitle('Add Blog Post')).toBeInTheDocument();
  await checkSnapshot(PUZZLEID);
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
