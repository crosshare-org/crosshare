import React from 'react';
import { anonymousUser, cleanup, render, fireEvent } from '../lib/testingUtils';
import waitForExpect from 'wait-for-expect';
import { Puzzle } from '../components/Puzzle';
import { ServerPuzzleResult } from '../lib/types';
import { PlayT } from '../lib/dbtypes';
import * as plays from '../lib/plays';
import PuzzlePage from '../pages/crosswords/[puzzleId]';
import * as firebaseWrapper from '../lib/firebaseWrapper';
import { setApp, setUpForSignInAnonymously, TimestampClass } from '../lib/firebaseWrapper';
import * as firebaseTesting from '@firebase/testing';

jest.mock('../lib/firebaseWrapper');

afterEach(() => {
  jest.clearAllMocks();
});

window.HTMLElement.prototype.scrollIntoView = function() { return; };

const testPuzzle: ServerPuzzleResult = {
  authorId: 'test-author-id',
  category: null,
  authorName: 'Mike D',
  moderated: true,
  publishTime: 100000,
  title: 'Without company',
  size: { rows: 5, cols: 5 },
  clues: [
    { dir: 0, clue: '"A New ___": first Star Wars movie released', num: 1 },
    { dir: 0, clue: 'Without company', num: 5 },
    { dir: 0, clue: 'Fragrant spring flower', num: 7 },
    { dir: 0, clue: 'Throw out', num: 8 },
    { dir: 0, clue: 'This, in Madrid', num: 9 },
    { dir: 1, clue: 'In good health', num: 1 },
    { dir: 1, clue: 'Popeye\'s love', num: 2 },
    { dir: 1, clue: 'Ancient Greek city-state', num: 3 },
    { dir: 1, clue: 'Pass, as a law', num: 4 },
    { dir: 1, clue: 'Prefix used in "Ghostbusters"', num: 6 },
  ],
  grid: [
    'H', 'O', 'P', 'E', '.', 'A', 'L', 'O', 'N', 'E', 'L', 'I', 'L', 'A', 'C', 'E', 'V', 'I', 'C', 'T', '.', 'E', 'S', 'T', 'O',
  ],
  highlighted: [],
  highlight: 'circle',
  id: 'test-puzzle',
  comments: [],
  constructorNotes: null,
  constructorPage: null,
};

test('clicking a clue sets slot to active', () => {
  const { getAllByText, getByLabelText } = render(
    <Puzzle loadingPlayState={false} puzzle={testPuzzle} play={null} isAdmin={false} />,
    {}
  );

  const cell = getByLabelText('cell0x1');
  expect(cell).toHaveStyleRule('background', 'var(--secondary)');

  const cell2 = getByLabelText('cell1x1');
  expect(cell2).toHaveStyleRule('background', 'var(--white)');

  const clue = getAllByText(/popeye's love/i)[0];
  expect(clue).toBeInTheDocument();
  fireEvent.click(clue);

  expect(cell).toHaveStyleRule('background', 'var(--primary)');
  expect(cell2).toHaveStyleRule('background', 'var(--secondary)');
});

const dailymini_5_19: ServerPuzzleResult = {
  constructorPage: null,
  authorId: 'fSEwJorvqOMK5UhNMHa4mu48izl1',
  category: 'dailymini',
  authorName: 'Mike D',
  moderated: true,
  publishTime: 1000,
  title: 'Word of surrender',
  size: { rows: 5, cols: 5 },
  clues: [
    { dir: 0, clue: 'Word with Cod or Canaveral', num: 1 },
    { dir: 0, clue: 'Caustic compound', num: 4 },
    { dir: 0, clue: 'Word of surrender', num: 6 },
    { dir: 0, clue: 'Not feel well', num: 8 },
    { dir: 0, clue: '"Whats gotten ___ you?"', num: 9 },
    { dir: 1, clue: 'Game with Miss Scarlet and Professor Plum', num: 1 },
    { dir: 1, clue: 'Rand who wrote "Atlas Shrugged"', num: 2 },
    { dir: 1, clue: 'Butter ___ (ice cream flavor)', num: 3 },
    { dir: 1, clue: 'Former Knicks star Anthony, to fans', num: 5 },
    { dir: 1, clue: 'Exciting, in modern lingo', num: 7 },
  ],
  grid: [
    'C', 'A', 'P', 'E', '.', 'L', 'Y', 'E', '.', 'M', 'U', 'N', 'C', 'L', 'E', 'E', '.', 'A', 'I', 'L', '.', 'I', 'N', 'T', 'O',
  ],
  highlighted: [],
  highlight: 'circle',
  comments: [],
  id: 'iMwPVXfePmv3bJC6KaQL',
  constructorNotes: null,
};

test('daily mini from 5/19/20', () => {
  const {
    getByLabelText,
    getByText,
    queryByText,
    getAllByText,
    container,
  } = render(<Puzzle puzzle={dailymini_5_19} play={null} loadingPlayState={false} isAdmin={false} />, {});

  fireEvent.click(getByText(/Begin Puzzle/i));
  expect(queryByText(/Begin Puzzle/i)).toBeNull();

  const clue = getAllByText(/professor plum/i)[0].parentElement ?.parentElement;
  expect(clue).toHaveStyleRule('background-color', 'var(--secondary)');

  // This puzzle has some cells w/ only a single entry (no cross) which were
  // causing errors when tabbing through the puzzle
  fireEvent.keyDown(container, { key: 'Tab', keyCode: 9 });
  fireEvent.keyDown(container, { key: 'Tab', keyCode: 9 });
  fireEvent.keyDown(container, { key: 'Tab', keyCode: 9 });
  fireEvent.keyDown(container, { key: 'Tab', keyCode: 9 });
  fireEvent.keyDown(container, { key: 'Tab', keyCode: 9 });

  expect(clue).toHaveStyleRule('background-color', 'var(--lighter)');

  // After a naive fix of the above issue we were still having problems on click
  fireEvent.click(getByLabelText('cell0x3'));
  const clueOne = getAllByText(/word with cod/i)[0].parentElement
    ?.parentElement;
  expect(clueOne).toHaveStyleRule('background-color', 'var(--lighter)');
});

test('nonuser progress should be cached in local storage but not db', async () => {
  jest.spyOn(plays, 'writePlayToDB');
  sessionStorage.clear();
  localStorage.clear();
  plays.resetMemoryStore();
  await firebaseTesting.clearFirestoreData({ projectId: 'test1' });

  const app = firebaseTesting.initializeTestApp({ projectId: 'test1' });
  setApp(app as firebase.app.App);
  const admin = firebaseTesting.initializeAdminApp({ projectId: 'test1' });

  expect((await admin.firestore().collection('p').get()).size).toEqual(0);

  let { findByText, findByTitle, queryByText, getByLabelText, container } = render(
    <PuzzlePage puzzle={dailymini_5_19} />, {}
  );

  fireEvent.click(await findByText(/Begin Puzzle/i));
  expect(queryByText(/Begin Puzzle/i)).toBeNull();

  fireEvent.keyDown(container, { key: 'A', keyCode: 65 });
  fireEvent.keyDown(container, { key: 'B', keyCode: 66 });
  fireEvent.keyDown(container, { key: 'C', keyCode: 67 });

  let cell = getByLabelText('cell0x1');
  expect(cell).toHaveTextContent('B');

  let cell2 = getByLabelText('cell0x2');
  expect(cell2).toHaveTextContent('C');

  expect(getByLabelText('grid')).toMatchSnapshot();

  // Pause doesn't cause us to write to db
  fireEvent.click(await findByTitle(/Pause Game/i));

  // Unmount doesn't cause us to write to the db
  expect((await admin.firestore().collection('p').get()).size).toEqual(0);
  await cleanup();
  await flushPromises();
  expect((await admin.firestore().collection('p').get()).size).toEqual(0);

  // Now try again!
  ({ findByTitle, findByText, queryByText, getByLabelText, container } = render(
    <PuzzlePage puzzle={dailymini_5_19} />, {}
  ));

  fireEvent.click(await findByText(/Resume/i, undefined, { timeout: 3000 }));
  expect(queryByText(/Resume/i)).toBeNull();

  cell = getByLabelText('cell0x1');
  expect(cell).toHaveTextContent('B');

  cell2 = getByLabelText('cell0x2');
  expect(cell2).toHaveTextContent('C');

  await cleanup();
  await flushPromises();

  expect((await admin.firestore().collection('p').get()).size).toEqual(0);
  expect(plays.writePlayToDB).toHaveBeenCalledTimes(0);

  await admin.delete();
  await app.delete();
});

// TODO this doesn't really work that well
function flushPromises() {
  return new Promise(resolve => setImmediate(resolve));
}

test('anonymous user progress should be cached in local storage and db', async () => {
  jest.spyOn(plays, 'writePlayToDB');
  sessionStorage.clear();
  localStorage.clear();
  plays.resetMemoryStore();
  await firebaseTesting.clearFirestoreData({ projectId: 'test1' });

  const app = firebaseTesting.initializeTestApp({
    projectId: 'test1',
    auth: {
      uid: 'anonymous-user-id', admin: false, firebase: {
        sign_in_provider: 'anonymous'
      }
    }
  });
  setApp(app as firebase.app.App);
  const admin = firebaseTesting.initializeAdminApp({ projectId: 'test1' });

  let { findByTitle, findByText, queryByText, getByLabelText, container } = render(
    <PuzzlePage puzzle={dailymini_5_19} />, { user: anonymousUser }
  );

  fireEvent.click(await findByText(/Begin Puzzle/i, undefined, { timeout: 3000 }));
  expect(queryByText(/Begin Puzzle/i)).toBeNull();

  fireEvent.keyDown(container, { key: 'A', keyCode: 65 });
  fireEvent.keyDown(container, { key: 'B', keyCode: 66 });
  fireEvent.keyDown(container, { key: 'C', keyCode: 67 });

  let cell = getByLabelText('cell0x1');
  expect(cell).toHaveTextContent('B');

  let cell2 = getByLabelText('cell0x2');
  expect(cell2).toHaveTextContent('C');

  expect(getByLabelText('grid')).toMatchSnapshot();

  // Pause should cause us to write to the db

  expect(plays.writePlayToDB).toHaveBeenCalledTimes(0);
  expect((await admin.firestore().collection('p').get()).size).toEqual(0);
  fireEvent.click(await findByTitle(/Pause Game/i));
  await cleanup();
  await waitForExpect(async () => expect((await admin.firestore().collection('p').get()).size).toEqual(1));
  expect(plays.writePlayToDB).toHaveBeenCalledTimes(1);

  // Now try again!
  ({ findByTitle, findByText, queryByText, getByLabelText, container } = render(
    <PuzzlePage puzzle={dailymini_5_19} />, { user: anonymousUser }
  ));

  await findByText(/Resume/i, undefined, { timeout: 3000 });

  cell = getByLabelText('cell0x1');
  expect(cell).toHaveTextContent('B');

  cell2 = getByLabelText('cell0x2');
  expect(cell2).toHaveTextContent('C');

  await cleanup();
  await flushPromises();

  expect((await admin.firestore().collection('p').get()).size).toEqual(1);
  expect(plays.writePlayToDB).toHaveBeenCalledTimes(1);

  // Now try again w/o Local storage!
  sessionStorage.clear();
  localStorage.clear();
  plays.resetMemoryStore();
  ({ findByTitle, findByText, queryByText, getByLabelText, container } = render(
    <PuzzlePage puzzle={dailymini_5_19} />, { user: anonymousUser }
  ));

  await findByText(/Resume/i, undefined, { timeout: 3000 });

  cell = getByLabelText('cell0x1');
  expect(cell).toHaveTextContent('B');

  cell2 = getByLabelText('cell0x2');
  expect(cell2).toHaveTextContent('C');
  fireEvent.click(await findByTitle(/Pause Game/i));

  await cleanup();
  await flushPromises();

  expect((await admin.firestore().collection('p').get()).size).toEqual(1);
  expect(plays.writePlayToDB).toHaveBeenCalledTimes(2);

  await admin.delete();
  await app.delete();
});

test('visiting a puzzle youve already solved should not write to db', async () => {
  jest.spyOn(plays, 'writePlayToDB');
  sessionStorage.clear();
  localStorage.clear();
  plays.resetMemoryStore();
  await firebaseTesting.clearFirestoreData({ projectId: 'test1' });

  const app = firebaseTesting.initializeTestApp({
    projectId: 'test1',
    auth: {
      uid: 'anonymous-user-id', admin: false, firebase: {
        sign_in_provider: 'anonymous'
      }
    }
  });
  setApp(app as firebase.app.App);
  const admin = firebaseTesting.initializeAdminApp({ projectId: 'test1' });

  const play: PlayT = {
    c: dailymini_5_19.id,
    u: 'anonymous-user-id',
    ua: TimestampClass.now(),
    g: [
      'C', 'A', 'P', 'E', '.', 'L', 'Y', 'E', '.', 'M', 'U', 'N', 'C', 'L', 'E', 'E', '.', 'A', 'I', 'L', '.', 'I', 'N', 'T', 'O',
    ],
    ct: [],
    uc: [],
    vc: [],
    wc: [],
    we: [],
    rc: [],
    t: 70,
    ch: false,
    f: true,
    n: 'Puzzle title'
  };
  await admin.firestore().collection('p').doc(dailymini_5_19.id + '-anonymous-user-id').set(play);

  const { findByText } = render(
    <PuzzlePage puzzle={dailymini_5_19} />, { user: anonymousUser }
  );

  await findByText(/You solved the puzzle in/i, { exact: false });
  await cleanup();
  expect(plays.writePlayToDB).toHaveBeenCalledTimes(0);

  await admin.delete();
  await app.delete();
});

test('user finishing a puzzle causes write to db', async () => {
  jest.spyOn(plays, 'writePlayToDB');
  sessionStorage.clear();
  localStorage.clear();
  plays.resetMemoryStore();
  await firebaseTesting.clearFirestoreData({ projectId: 'test1' });

  const app = firebaseTesting.initializeTestApp({
    projectId: 'test1',
    auth: {
      uid: 'anonymous-user-id', admin: false, firebase: {
        sign_in_provider: 'anonymous'
      }
    }
  });
  setApp(app as firebase.app.App);
  const admin = firebaseTesting.initializeAdminApp({ projectId: 'test1' });

  const r = render(
    <PuzzlePage puzzle={dailymini_5_19} />, { user: anonymousUser }
  );

  fireEvent.click(await r.findByText(/Begin Puzzle/i));
  expect(r.queryByText(/Begin Puzzle/i)).toBeNull();

  fireEvent.keyDown(r.container, { key: 'A', keyCode: 65 });
  fireEvent.keyDown(r.container, { key: 'B', keyCode: 66 });
  fireEvent.keyDown(r.container, { key: 'C', keyCode: 67 });

  fireEvent.click(r.getByText('Reveal'));
  fireEvent.click(r.getByText(/Reveal Puzzle/i));

  const cell = r.getByLabelText('cell0x1');
  expect(cell).toHaveTextContent('A');

  const cell2 = r.getByLabelText('cell0x2');
  expect(cell2).toHaveTextContent('P');

  // We've already written to the db when the puzzle was completed
  await waitForExpect(async () => expect((await admin.firestore().collection('p').get()).size).toEqual(1));
  expect(plays.writePlayToDB).toHaveBeenCalledTimes(1);

  await cleanup();
  expect((await admin.firestore().collection('p').get()).size).toEqual(1);
  expect(plays.writePlayToDB).toHaveBeenCalledTimes(1);

  await admin.delete();
  await app.delete();
});

test('nonuser finishing a puzzle should cause creation of anonymous user and write to db', async () => {
  jest.spyOn(plays, 'writePlayToDB');
  jest.spyOn(firebaseWrapper, 'signInAnonymously');
  sessionStorage.clear();
  localStorage.clear();
  plays.resetMemoryStore();
  await firebaseTesting.clearFirestoreData({ projectId: 'test1' });

  const anonApp = firebaseTesting.initializeTestApp({
    projectId: 'test1',
    auth: {
      uid: 'anonymous-user-id', admin: false, firebase: {
        sign_in_provider: 'anonymous'
      }
    }
  });
  const baseApp = firebaseTesting.initializeTestApp({
    projectId: 'test1'
  });
  setApp(baseApp as firebase.app.App);
  setUpForSignInAnonymously(anonApp as firebase.app.App, anonymousUser);

  const admin = firebaseTesting.initializeAdminApp({ projectId: 'test1' });

  const r = render(
    <PuzzlePage puzzle={dailymini_5_19} />, {}
  );

  fireEvent.click(await r.findByText(/Begin Puzzle/i));
  expect(r.queryByText(/Begin Puzzle/i)).toBeNull();

  fireEvent.keyDown(r.container, { key: 'A', keyCode: 65 });
  fireEvent.keyDown(r.container, { key: 'B', keyCode: 66 });
  fireEvent.keyDown(r.container, { key: 'C', keyCode: 67 });

  expect(firebaseWrapper.signInAnonymously).toHaveBeenCalledTimes(0);

  fireEvent.click(r.getByText('Reveal'));
  fireEvent.click(r.getByText(/Reveal Puzzle/i));

  const cell = r.getByLabelText('cell0x1');
  expect(cell).toHaveTextContent('A');

  const cell2 = r.getByLabelText('cell0x2');
  expect(cell2).toHaveTextContent('P');

  // We've already written to the db when the puzzle was completed
  await waitForExpect(async () => expect((await admin.firestore().collection('p').get()).size).toEqual(1));
  expect(plays.writePlayToDB).toHaveBeenCalledTimes(1);
  expect(firebaseWrapper.signInAnonymously).toHaveBeenCalledTimes(1);

  // This was causing an error on completed puzzles.
  fireEvent.click(r.getByLabelText('Previous Entry'));
  fireEvent.click(r.getByLabelText('Previous Entry'));
  fireEvent.click(r.getByLabelText('Previous Entry'));

  await cleanup();
  expect((await admin.firestore().collection('p').get()).size).toEqual(1);
  expect(plays.writePlayToDB).toHaveBeenCalledTimes(1);

  await admin.delete();
  await baseApp.delete();
  await anonApp.delete();
});
