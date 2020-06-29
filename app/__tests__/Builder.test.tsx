import React from 'react';
import { getByLabelText, getUser, cleanup, render, fireEvent } from '../lib/testingUtils';
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

window.HTMLElement.prototype.scrollIntoView = function() { return; };

const mike = getUser('mike', false);
const miked = getUser('miked', true);
const rando = getUser('tom', false);
const projectId = 'builder-test';

test('puzzle in progress should be cached in local storage', async () => {
  sessionStorage.clear();
  localStorage.clear();

  const app = firebaseTesting.initializeTestApp({
    projectId,
    auth: {
      uid: 'mike', admin: false, firebase: {
        sign_in_provider: 'google'
      }
    }
  });
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

  await app.delete();
});

test('publish as daily mini', async () => {
  sessionStorage.clear();
  localStorage.clear();

  await firebaseTesting.clearFirestoreData({ projectId });

  const serverApp = firebaseTesting.initializeTestApp({ projectId });
  const randoApp = firebaseTesting.initializeTestApp({
    projectId,
    auth: {
      uid: 'tom', admin: false, firebase: {
        sign_in_provider: 'google'
      }
    }
  });
  const adminUserApp = firebaseTesting.initializeTestApp({
    projectId,
    auth: {
      uid: 'miked', admin: true, firebase: {
        sign_in_provider: 'google'
      }
    }
  });
  const app = firebaseTesting.initializeTestApp({
    projectId,
    auth: {
      uid: 'mike', admin: false, firebase: {
        sign_in_provider: 'google'
      }
    }
  });
  setApp(app as firebase.app.App);
  const admin = firebaseTesting.initializeAdminApp({ projectId });

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

  const dmChoice = await (r.findByText(/Submit as Daily Mini/i));
  fireEvent.click(dmChoice);

  fireEvent.click(await r.findByText('Publish Puzzle', { exact: true }));
  await (r.findByText(/Published Successfully/));

  let dailyMinis = await admin.firestore().collection('categories').doc('dailymini').get();
  expect(dailyMinis.data()).toEqual({});

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

  // The puzzle should be visible to an admin on pending w/ moderation links
  setApp(adminUserApp as firebase.app.App);
  const r4 = render(<PuzzleLoader puzzleId={puzzleId} />, { user: miked, isAdmin: true });
  await r4.findByText(/visible to others yet/i);
  await r4.findByText(/Enter Rebus/i);
  fireEvent.click(r4.getByText(/Moderate/i));
  const scheduleButton = await r4.findByText(/Schedule As Daily Mini/i);
  fireEvent.click(r4.getByText((new Date()).getDate().toString(10)), { exact: true });
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

  dailyMinis = await admin.firestore().collection('categories').doc('dailymini').get();
  const dmData = dailyMinis.data();
  if (!dmData) {
    throw new Error('missing dms');
  }
  expect(dmData).toEqual({ [getDateString(new Date())]: puzzleId });

  await cleanup();

  await randoApp.delete();
  await adminUserApp.delete();
  await serverApp.delete();
  await admin.delete();
  await app.delete();
});

test.todo('publish as default');

test.todo('requested daily mini but approved as default');

test.todo('change author name in publish dialogue should publish w/ new name');
