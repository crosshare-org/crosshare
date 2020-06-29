import React from 'react';
import { getByLabelText, getUser, cleanup, render, fireEvent, RenderResult } from '../lib/testingUtils';
import { BuilderPage } from '../pages/construct';
import { setApp } from '../lib/firebaseWrapper';
import * as firebaseTesting from '@firebase/testing';
import NextJSRouter from 'next/router';
import PuzzlePage, { getServerSideProps } from '../pages/crosswords/[puzzleId]';
import { PuzzleLoader } from '../pages/pending/[pendingPuzzleId]';
import waitForExpect from 'wait-for-expect';
import { getDateString } from '../lib/dbtypes';

jest.mock('next/router', () => ({ push: jest.fn() }));
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
    <BuilderPage isAdmin={false} user={mike} />, { user: mike }
  );

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
    <BuilderPage isAdmin={false} user={mike} />, { user: mike }
  );
  await r.findByText(/Across/i);
  expect(r.getByLabelText('cell0x1')).toHaveTextContent('B');
  expect(r.getByLabelText('cell0x2')).toHaveTextContent('C');
});

async function publishPuzzle(submitType: RegExp, prePublish?: (r: RenderResult) => Promise<void>) {
  sessionStorage.clear();
  localStorage.clear();

  await firebaseTesting.clearFirestoreData({ projectId });

  setApp(app as firebase.app.App);

  await admin.firestore().collection('categories').doc('dailymini').set({});

  const r = render(
    <BuilderPage isAdmin={false} user={mike} />, { user: mike }
  );

  const grid = r.getByLabelText('cell0x0').parentElement || window;

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

  fireEvent.click(r.getByText('Back to Grid', { exact: true }));
  fireEvent.click(r.getByText('Publish', { exact: true }));

  const dmChoice = await (r.findByText(submitType));
  fireEvent.click(dmChoice);

  if (prePublish) {
    await prePublish(r);
  }

  fireEvent.click(await r.findByText('Publish Puzzle', { exact: true }));
  await (r.findByText(/Published Successfully/));

  const dailyMinis = await admin.firestore().collection('categories').doc('dailymini').get();
  expect(dailyMinis.data()).toEqual({});
}

async function publishAsDailyMini() {
  await publishPuzzle(/Submit as Daily Mini/i);

  const puzzles = await admin.firestore().collection('c').get();
  expect(puzzles.size).toEqual(1);
  const puzzle = puzzles.docs[0].data();
  const puzzleId = puzzles.docs[0].id;
  expect(puzzle['m']).toEqual(false);
  expect(puzzle['p']).toEqual(null);
  expect(puzzle['c']).toEqual('dailymini');
  expect(puzzle['t']).toEqual('Our Title');
  await waitForExpect(async () => expect(NextJSRouter.push).toHaveBeenCalledTimes(1));
  expect(NextJSRouter.push).toHaveBeenCalledWith('/pending/' + puzzles.docs[0].id);

  await cleanup();

  // The puzzle should not be visible on the puzzle page, even to an author
  setApp(serverApp as firebase.app.App);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const props = await getServerSideProps({ params: { puzzleId }, res: { setHeader: jest.fn() } } as any);
  setApp(app as firebase.app.App);
  const r1 = render(<PuzzlePage {...props.props} />, { user: mike });
  expect(await r1.findByText('Puzzle Not Found')).toBeInTheDocument();

  await cleanup();

  // The puzzle should not be visible to a rando on pending
  setApp(randoApp as firebase.app.App);
  const r2 = render(<PuzzleLoader puzzleId={puzzleId} />, { user: rando });
  await r2.findByText(/error loading puzzle/i);

  await cleanup();

  // The puzzle should be visible to the author on pending w/o redirecting
  setApp(app as firebase.app.App);
  const r3 = render(<PuzzleLoader puzzleId={puzzleId} />, { user: mike });
  await r3.findByText(/visible to others yet/i);
  await r3.findByText(/Enter Rebus/i);
  expect(r3.queryByText(/Moderate/i)).toBeNull();

  await cleanup();

  return puzzleId;
}

test('publish as daily mini', async () => {
  const puzzleId = await publishAsDailyMini();

  // The puzzle should be visible to an admin on pending w/ moderation links
  setApp(adminUserApp as firebase.app.App);
  const r4 = render(<PuzzleLoader puzzleId={puzzleId} />, { user: miked, isAdmin: true });
  await r4.findByText(/visible to others yet/i);
  await r4.findByText(/Enter Rebus/i);
  fireEvent.click(r4.getByText(/Moderate/i));
  const scheduleButton = await r4.findByText(/Schedule As Daily Mini/i);
  const dateToClick = new Date().getDate();
  // Make sure we are clicking on today if we are seeing other months too.
  if (dateToClick < 15) {
    fireEvent.click(r4.getAllByText(dateToClick.toString(10), { exact: true })[0]);
  } else {
    fireEvent.click(r4.getAllByText(dateToClick.toString(10), { exact: true }).slice(-1)[0]);
  }
  fireEvent.click(scheduleButton);

  await waitForExpect(async () => expect((await admin.firestore().collection('c').where('m', '==', true).get()).size).toEqual(1));
  const res = await admin.firestore().collection('c').get();
  expect(res.size).toEqual(1);
  const updated = res.docs[0].data();
  expect(res.docs[0].id).toEqual(puzzleId);
  expect(updated['m']).toEqual(true);
  expect(updated['p']).not.toEqual(null);
  expect(updated['c']).toEqual('dailymini');
  expect(updated['t']).toEqual('Our Title');

  const dailyMinis = await admin.firestore().collection('categories').doc('dailymini').get();
  const dmData = dailyMinis.data();
  if (!dmData) {
    throw new Error('missing dms');
  }
  expect(dmData).toEqual({ [getDateString(new Date())]: puzzleId });

  await cleanup();

  // The puzzle should be visible on the puzzle page, even to a rando
  setApp(serverApp as firebase.app.App);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const props1 = await getServerSideProps({ params: { puzzleId }, res: { setHeader: jest.fn() } } as any);
  setApp(randoApp as firebase.app.App);
  const r5 = render(<PuzzlePage {...props1.props} />, { user: rando });
  expect(await r5.findByText('Begin Puzzle')).toBeInTheDocument();
  expect(r5.queryByText(/Our Title/)).toBeNull();
  expect(r5.queryByText(/Daily Mini/)).toBeInTheDocument();
});

test('requested daily mini but approved as default', async () => {
  const puzzleId = await publishAsDailyMini();

  // The puzzle should be visible to an admin on pending w/ moderation links
  setApp(adminUserApp as firebase.app.App);
  const r4 = render(<PuzzleLoader puzzleId={puzzleId} />, { user: miked, isAdmin: true });
  await r4.findByText(/visible to others yet/i);
  await r4.findByText(/Enter Rebus/i);
  fireEvent.click(r4.getByText(/Moderate/i));
  const approveButton = await r4.findByText(/Approve Puzzle/i);
  fireEvent.click(approveButton);

  await waitForExpect(async () => expect((await admin.firestore().collection('c').where('m', '==', true).get()).size).toEqual(1));
  const res = await admin.firestore().collection('c').get();
  expect(res.size).toEqual(1);
  const updated = res.docs[0].data();
  expect(res.docs[0].id).toEqual(puzzleId);
  expect(updated['m']).toEqual(true);
  expect(updated['p']).not.toEqual(null);
  expect(updated['c']).toEqual(null);
  expect(updated['t']).toEqual('Our Title');

  const dailyMinis = await admin.firestore().collection('categories').doc('dailymini').get();
  expect(dailyMinis.data()).toEqual({});

  await cleanup();

  // The puzzle should be visible on the puzzle page, even to a rando
  setApp(serverApp as firebase.app.App);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const props1 = await getServerSideProps({ params: { puzzleId }, res: { setHeader: jest.fn() } } as any);
  setApp(randoApp as firebase.app.App);
  const r5 = render(<PuzzlePage {...props1.props} />, { user: rando });
  expect(await r5.findByText('Begin Puzzle')).toBeInTheDocument();
  expect(r5.queryByText(/Our Title/)).toBeInTheDocument();
  expect(r5.queryByText(/Daily Mini/)).toBeNull();
});

test('publish as default', async () => {
  await publishPuzzle(/Publish Immediately/i);

  const puzzles = await admin.firestore().collection('c').get();
  expect(puzzles.size).toEqual(1);
  const puzzle = puzzles.docs[0].data();
  const puzzleId = puzzles.docs[0].id;
  expect(puzzle['m']).toEqual(false);
  expect(puzzle['p']).not.toEqual(null);
  expect(puzzle['c']).toEqual(null);
  expect(puzzle['t']).toEqual('Our Title');
  await waitForExpect(async () => expect(NextJSRouter.push).toHaveBeenCalledTimes(1));
  expect(NextJSRouter.push).toHaveBeenCalledWith('/pending/' + puzzles.docs[0].id);

  await cleanup();

  // The puzzle should be visible on the puzzle page, even to a rando
  setApp(serverApp as firebase.app.App);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const props1 = await getServerSideProps({ params: { puzzleId }, res: { setHeader: jest.fn() } } as any);
  setApp(randoApp as firebase.app.App);
  const r5 = render(<PuzzlePage {...props1.props} />, { user: rando });
  expect(await r5.findByText('Begin Puzzle')).toBeInTheDocument();
  expect(r5.queryByText(/Our Title/)).toBeInTheDocument();
  expect(r5.queryByText(/by Anonymous Crossharer/)).toBeInTheDocument();
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
  expect(r4.queryByText(/Schedule As Daily Mini/i)).toBeNull();
  const approveButton = await r4.findByText(/Approve Puzzle/i);
  fireEvent.click(approveButton);

  await waitForExpect(async () => expect((await admin.firestore().collection('c').where('m', '==', true).get()).size).toEqual(1));
  const res = await admin.firestore().collection('c').get();
  expect(res.size).toEqual(1);
  const updated = res.docs[0].data();
  expect(res.docs[0].id).toEqual(puzzleId);
  expect(updated['m']).toEqual(true);
  expect(updated['p']).not.toEqual(null);
  expect(updated['c']).toEqual(null);
  expect(updated['t']).toEqual('Our Title');

  const dailyMinis = await admin.firestore().collection('categories').doc('dailymini').get();
  expect(dailyMinis.data()).toEqual({});
});

test('change author name in publish dialogue should publish w/ new name', async () => {
  await publishPuzzle(/Publish Immediately/i, async (r) => {
    fireEvent.click(r.getByText('change name'));
    fireEvent.change(r.getByLabelText('Update display name:'), { target: { value: 'M to tha D' } });
    fireEvent.click(r.getByText('Save', { exact: true }));
    await r.findByText(/M to tha D/i);
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
  await waitForExpect(async () => expect(NextJSRouter.push).toHaveBeenCalledTimes(1));
  expect(NextJSRouter.push).toHaveBeenCalledWith('/pending/' + puzzles.docs[0].id);

  await cleanup();

  // The puzzle should be visible on the puzzle page, even to a rando
  setApp(serverApp as firebase.app.App);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const props1 = await getServerSideProps({ params: { puzzleId }, res: { setHeader: jest.fn() } } as any);
  setApp(randoApp as firebase.app.App);
  const r5 = render(<PuzzlePage {...props1.props} />, { user: rando });
  expect(await r5.findByText('Begin Puzzle')).toBeInTheDocument();
  expect(r5.queryByText(/Our Title/)).toBeInTheDocument();
  expect(r5.queryByText(/by M to tha D/)).toBeInTheDocument();
  expect(r5.queryByText(/Daily Mini/)).toBeNull();
  await r5.findByText(/Enter Rebus/i);
  expect(r5.queryByText(/Moderate/i)).toBeNull();
});
