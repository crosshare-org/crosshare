import React from 'react';
import { getByLabelText, getUser, cleanup, render, fireEvent } from '../lib/testingUtils';
import { BuilderPage } from '../pages/construct';
import { setApp } from '../lib/firebaseWrapper';
import * as firebaseTesting from '@firebase/testing';
import NextJSRouter from 'next/router';

jest.mock('next/router', () => ({ push: jest.fn() }));
jest.mock('../lib/firebaseWrapper');
jest.mock('../lib/WordDB');

afterEach(() => {
  jest.clearAllMocks();
});

window.HTMLElement.prototype.scrollIntoView = function() { return; };

const mike = getUser('mike', false);
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

  fireEvent.click(r.getByText('Publish Puzzle', { exact: true }));
  await (r.findByText(/Published Successfully/));

  const puzzles = await admin.firestore().collection('c').get();
  expect(puzzles.size).toEqual(1);
  expect(puzzles.docs[0].data()['m']).toEqual(false);
  expect(puzzles.docs[0].data()['p']).toEqual(null);
  expect(puzzles.docs[0].data()['c']).toEqual('dailymini');
  expect(puzzles.docs[0].data()['t']).toEqual('Our Title');
  expect(NextJSRouter.push).toHaveBeenCalledTimes(1);
  expect(NextJSRouter.push).toHaveBeenCalledWith('/pending/' + puzzles.docs[0].id);

  await admin.delete();
  await app.delete();
});
