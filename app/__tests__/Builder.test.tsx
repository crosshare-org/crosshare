import React from 'react';
import { getByLabelText, getUser, cleanup, render, fireEvent, RenderResult } from '../lib/testingUtils';
import BuilderPage from '../pages/construct';
import { setApp, setAdminApp } from '../lib/firebaseWrapper';
import type firebaseAdminType from 'firebase-admin';
import * as firebaseTesting from '@firebase/testing';
import NextJSRouter from 'next/router';
import PuzzlePage, { getServerSideProps } from '../pages/crosswords/[puzzleId]';
import { PuzzleLoader as StatsPuzzleLoader } from '../pages/crosswords/[puzzleId]/stats';
import waitForExpect from 'wait-for-expect';

jest.mock('../lib/firebaseWrapper');
jest.mock('../lib/WordDB');

afterEach(() => {
  jest.clearAllMocks();
});

let serverApp: firebase.app.App, randoApp: firebase.app.App, adminUserApp: firebase.app.App, app: firebase.app.App, admin: firebase.app.App;

beforeAll(async () => {
  serverApp = firebaseTesting.initializeTestApp({ projectId }) as firebase.app.App;
  randoApp = firebaseTesting.initializeTestApp({
    projectId,
    auth: {
      uid: 'tom', admin: false, firebase: {
        sign_in_provider: 'google'
      }
    }
  }) as firebase.app.App;
  adminUserApp = firebaseTesting.initializeTestApp({
    projectId,
    auth: {
      uid: 'miked', admin: true, firebase: {
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
  await serverApp.delete();
  await randoApp.delete();
  await adminUserApp.delete();
});

window.HTMLElement.prototype.scrollIntoView = function() { return; };

const mike = getUser('mike', false);
const miked = getUser('miked', true);
const rando = getUser('tom', false);
const projectId = 'builder-test';

test('puzzle in progress should be cached in local storage', async () => {
  sessionStorage.clear();
  localStorage.clear();

  setApp(app as firebase.app.App);

  let r = render(
    <BuilderPage />, { user: mike }
  );
  fireEvent.click((await r.findAllByText('Launch Constructor'))[0]);

  await r.findByText(/Across/i);

  // Need to click somewhere on the grid display to capture keyboard
  const grid = r.getByLabelText('cell0x0').parentElement || window;

  fireEvent.keyDown(grid, { key: 'A', keyCode: 65 });
  fireEvent.keyDown(grid, { key: 'B', keyCode: 66 });
  fireEvent.keyDown(grid, { key: 'C', keyCode: 67 });

  expect(r.getByLabelText('cell0x1')).toHaveTextContent('B');
  expect(r.getByLabelText('cell0x2')).toHaveTextContent('C');
  expect(r.getByLabelText('grid')).toMatchSnapshot();

  await cleanup();

  // Now try again!
  r = render(
    <BuilderPage />, { user: mike }
  );
  fireEvent.click((await r.findAllByText('Launch Constructor'))[0]);

  await r.findByText(/Across/i);
  expect(r.getByLabelText('cell0x1')).toHaveTextContent('B');
  expect(r.getByLabelText('cell0x2')).toHaveTextContent('C');
});

async function publishPuzzle(
  prePublish?: (r: RenderResult) => Promise<void>,
  clueMode?: (r: RenderResult) => Promise<void>
) {
  sessionStorage.clear();
  localStorage.clear();

  await firebaseTesting.clearFirestoreData({ projectId });

  setApp(app as firebase.app.App);

  await admin.firestore().collection('categories').doc('dailymini').set({});

  const r = render(
    <BuilderPage />, { user: mike }
  );
  fireEvent.click((await r.findAllByText('Launch Constructor'))[0]);

  const grid = (await r.findByLabelText('cell0x0')).parentElement || window;

  for (let i = 0; i < 25; i += 1) {
    fireEvent.keyDown(grid, { key: String.fromCharCode(65 + i), keyCode: 65 + i });
  }

  fireEvent.click(r.getByText('Publish', { exact: true }));
  const err = await (r.findByText(/Please fix the following errors/i));

  if (err.parentElement === null) {
    throw new Error('missing parent');
  }

  fireEvent.click(getByLabelText(err.parentElement, 'close', { exact: true }));
  expect(r.queryByText(/Please fix the following errors/i)).toBeNull();

  fireEvent.click(r.getByText('Clues', { exact: true }));
  fireEvent.change(r.getByLabelText('ABCDE'), { target: { value: 'Clue 1' } });
  fireEvent.change(r.getByLabelText('AFKPU'), { target: { value: 'Clue 2' } });
  fireEvent.change(r.getByLabelText('BGLQV'), { target: { value: 'Clue 3' } });
  fireEvent.change(r.getByLabelText('CHMRW'), { target: { value: 'Clue 4' } });
  fireEvent.change(r.getByLabelText('DINSX'), { target: { value: 'Clue 5' } });
  fireEvent.change(r.getByLabelText('EJOTY'), { target: { value: 'Clue 6' } });
  fireEvent.change(r.getByLabelText('FGHIJ'), { target: { value: 'Clue 7' } });
  fireEvent.change(r.getByLabelText('KLMNO'), { target: { value: 'Clue 8' } });
  fireEvent.change(r.getByLabelText('PQRST'), { target: { value: 'Clue 9' } });
  fireEvent.change(r.getByLabelText('UVWXY'), { target: { value: 'Clue 10' } });
  fireEvent.change(r.getByLabelText('Title'), { target: { value: 'Our Title' } });
  if (clueMode) {
    await clueMode(r);
  }

  fireEvent.click(r.getByText('Back to Grid', { exact: true }));
  fireEvent.click(r.getByText('Publish', { exact: true }));

  const publishButton = await r.findByText('Publish Puzzle', { exact: true });

  if (prePublish) {
    await prePublish(r);
  }

  fireEvent.click(publishButton);
  await (r.findByText(/Published Successfully/, undefined, { timeout: 3000 }));

  const dailyMinis = await admin.firestore().collection('categories').doc('dailymini').get();
  expect(dailyMinis.data()).toEqual({});
}

test('publish as default', async () => {
  await publishPuzzle(undefined,
    async (r) => {
      fireEvent.click(r.getByText('This puzzle should be private until a specified date/time', { exact: true }));
    }
  );

  const puzzles = await admin.firestore().collection('c').get();
  expect(puzzles.size).toEqual(1);
  const puzzle = puzzles.docs[0].data();
  const puzzleId = puzzles.docs[0].id;
  expect(puzzle['m']).toEqual(false);
  expect(puzzle['p']).not.toEqual(null);
  expect(puzzle['c']).toEqual(null);
  expect(puzzle['t']).toEqual('Our Title');
  expect(puzzle['pvu']).not.toBeNull();
  await waitForExpect(async () => expect(NextJSRouter.push).toHaveBeenCalledTimes(1));
  expect(NextJSRouter.push).toHaveBeenCalledWith('/crosswords/' + puzzles.docs[0].id);

  await cleanup();

  // The puzzle should be visible on the puzzle page, even to a rando
  setApp(serverApp as firebase.app.App);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const props1 = await getServerSideProps({ params: { puzzleId }, res: { setHeader: jest.fn() } } as any);
  setApp(randoApp as firebase.app.App);
  const r5 = render(<PuzzlePage {...props1.props} />, { user: rando });
  expect(await r5.findByText('Begin Puzzle')).toBeInTheDocument();
  expect(r5.queryByText(/Our Title/)).toBeInTheDocument();
  expect(r5.queryByText(/By Anonymous Crossharer/)).toBeInTheDocument();
  expect(r5.queryByText(/Daily Mini/)).toBeNull();
  await r5.findByText(/Enter Rebus/i);
  expect(r5.queryByText(/Moderate/i)).toBeNull();

  await cleanup();

  // The puzzle should be visible to an admin w/ moderation links
  setApp(adminUserApp as firebase.app.App);
  const r4 = render(<PuzzlePage {...props1.props} />, { user: miked, isAdmin: true });
  await r4.findByText(/Enter Rebus/i);
  expect(r4.queryByText(/visible to others yet/i)).toBeNull();
  fireEvent.click(r4.getByText(/Moderate/i));
  expect(r4.queryByText(/private until/i)).not.toBeNull();
  const approveButton = await r4.findByText(/Set as Featured/i);
  fireEvent.click(approveButton);

  await waitForExpect(async () => expect((await admin.firestore().collection('c').where('m', '==', true).get()).size).toEqual(1));
  const res = await admin.firestore().collection('c').get();
  expect(res.size).toEqual(1);
  const updated = res.docs[0].data();
  expect(res.docs[0].id).toEqual(puzzleId);
  expect(updated['m']).toEqual(true);
  expect(updated['f']).toEqual(true);
  expect(updated['p']).not.toEqual(null);
  expect(updated['c']).toEqual(null);
  expect(updated['t']).toEqual('Our Title');

  const dailyMinis = await admin.firestore().collection('categories').doc('dailymini').get();
  expect(dailyMinis.data()).toEqual({});
});

test('change author name in publish dialogue should publish w/ new name', async () => {
  await publishPuzzle(async (r) => {
    fireEvent.click(r.getByText('change name'));
    fireEvent.change(r.getByLabelText('Update display name:'), { target: { value: 'M to tha D' } });
    fireEvent.click(r.getByText('Save', { exact: true }));
    await r.findByText(/M to tha D/i);
  },
  async (r) => {
    fireEvent.click(r.getByText('This puzzle is private', { exact: true }));
  });

  const puzzles = await admin.firestore().collection('c').get();
  expect(puzzles.size).toEqual(1);
  const puzzle = puzzles.docs[0].data();
  const puzzleId = puzzles.docs[0].id;
  expect(puzzle['m']).toEqual(false);
  expect(puzzle['p']).not.toEqual(null);
  expect(puzzle['c']).toEqual(null);
  expect(puzzle['t']).toEqual('Our Title');
  expect(puzzle['n']).toEqual('M to tha D');
  expect(puzzle['pv']).toEqual(true);
  expect(puzzle['pvu']).toBeUndefined();
  await waitForExpect(async () => expect(NextJSRouter.push).toHaveBeenCalledTimes(1));
  expect(NextJSRouter.push).toHaveBeenCalledWith('/crosswords/' + puzzles.docs[0].id);

  await cleanup();

  // The stats page shouldn't error even though there aren't any yet
  const stats = render(<StatsPuzzleLoader puzzleId={puzzleId} auth={{ user: mike, isAdmin: false }} />, { user: mike });
  expect(await stats.findByText(/stats for this puzzle yet/)).toBeInTheDocument();

  await cleanup();

  // The puzzle should be visible on the puzzle page, even to a rando
  setApp(serverApp as firebase.app.App);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const props1 = await getServerSideProps({ params: { puzzleId }, res: { setHeader: jest.fn() } } as any);
  setApp(randoApp as firebase.app.App);
  const r5 = render(<PuzzlePage {...props1.props} />, { user: rando });
  expect(await r5.findByText('Begin Puzzle')).toBeInTheDocument();
  expect(r5.queryByText(/Our Title/)).toBeInTheDocument();
  expect(r5.queryByText(/By M to tha D/)).toBeInTheDocument();
  expect(r5.queryByText(/Daily Mini/)).toBeNull();
  await r5.findByText(/Enter Rebus/i);
  expect(r5.queryByText(/Moderate/i)).toBeNull();
});

test('publish custom / non-rectangular size', async () => {
  sessionStorage.clear();
  localStorage.clear();

  await firebaseTesting.clearFirestoreData({ projectId });

  setApp(app as firebase.app.App);

  const r = render(
    <BuilderPage />, { user: mike }
  );
  fireEvent.click((await r.findAllByText('Launch Constructor'))[0]);

  fireEvent.click(await (r.findByText('New Puzzle', { exact: true })));

  const size = await (r.findByText('Custom', { exact: true }));
  fireEvent.click(size);
  fireEvent.change(await r.findByPlaceholderText('Rows'), { target: { value: '4' } });
  fireEvent.change(r.getByPlaceholderText('Columns'), { target: { value: '5' } });
  fireEvent.click(r.getByText('Create New Puzzle'));

  const grid = (await r.findByLabelText('cell0x0')).parentElement || window;
  expect(r.getByLabelText('grid')).toMatchSnapshot();

  for (let i = 0; i < 20; i += 1) {
    fireEvent.keyDown(grid, { key: String.fromCharCode(65 + i), keyCode: 65 + i });
  }

  fireEvent.click(r.getByText('Clues', { exact: true }));
  fireEvent.change(r.getByLabelText('ABCDE'), { target: { value: 'Clue 1' } });
  fireEvent.change(r.getByLabelText('FGHIJ'), { target: { value: 'Clue 7' } });
  fireEvent.change(r.getByLabelText('KLMNO'), { target: { value: 'Clue 8' } });
  fireEvent.change(r.getByLabelText('PQRST'), { target: { value: 'Clue 9' } });

  fireEvent.change(r.getByLabelText('AFKP'), { target: { value: 'Clue 2' } });
  fireEvent.change(r.getByLabelText('BGLQ'), { target: { value: 'Clue 3' } });
  fireEvent.change(r.getByLabelText('CHMR'), { target: { value: 'Clue 4' } });
  fireEvent.change(r.getByLabelText('DINS'), { target: { value: 'Clue 5' } });
  fireEvent.change(r.getByLabelText('EJOT'), { target: { value: 'Clue 6' } });
  fireEvent.change(r.getByLabelText('Title'), { target: { value: 'Our Title' } });

  fireEvent.click(r.getByText('Add a blog post'));
  fireEvent.change(r.getByPlaceholderText('Your post text (markdown format)'), { target: { value: 'Here is our new blog post' } });

  fireEvent.click(r.getByText('Back to Grid', { exact: true }));
  fireEvent.click(r.getByText('Publish', { exact: true }));
  fireEvent.click(await r.findByText('Publish Puzzle', { exact: true }));
  await (r.findByText(/Published Successfully/));

  const puzzles = await admin.firestore().collection('c').get();
  expect(puzzles.size).toEqual(1);
  const puzzle = puzzles.docs[0].data();
  const puzzleId = puzzles.docs[0].id;
  expect(puzzle['m']).toEqual(false);
  expect(puzzle['p']).not.toEqual(null);
  expect(puzzle['c']).toEqual(null);
  expect(puzzle['t']).toEqual('Our Title');
  expect(puzzle['bp']).toEqual('Here is our new blog post');
  expect(puzzle['pv']).toBeUndefined();
  expect(puzzle['pvu']).toBeUndefined();

  await waitForExpect(async () => expect(NextJSRouter.push).toHaveBeenCalledTimes(1));
  expect(NextJSRouter.push).toHaveBeenCalledWith('/crosswords/' + puzzles.docs[0].id);

  await cleanup();

  // The puzzle should be visible on the puzzle page, even to a rando
  setApp(serverApp as firebase.app.App);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const props1 = await getServerSideProps({ params: { puzzleId }, res: { setHeader: jest.fn() } } as any);
  setApp(randoApp as firebase.app.App);
  const r5 = render(<PuzzlePage {...props1.props} />, { user: rando });
  expect(await r5.findByText('Begin Puzzle')).toBeInTheDocument();
  expect(r5.queryByText(/Our Title/)).toBeInTheDocument();
  expect(r5.queryByText(/Here is our new blog post/)).toBeInTheDocument();
  expect(r5.queryByText(/Daily Mini/)).toBeNull();
  await r5.findByText(/Enter Rebus/i);
  expect(r5.queryByText(/Moderate/i)).toBeNull();

  expect(r5.getByLabelText('grid')).toMatchSnapshot();
});
