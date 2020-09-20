import * as firebaseTesting from '@firebase/testing';
import type firebaseAdminType from 'firebase-admin';

import { setAdminApp } from '../lib/firebaseWrapper';
//import { getUser, render, cleanup, fireEvent } from '../lib/testingUtils';

const projectId = 'paginationtests';

jest.mock('../lib/firebaseWrapper');

import { getPuzzlesForFeatured } from '../lib/serverOnly';
import { getMockedPuzzle } from '../lib/testingUtils';

test('try it when empty', async () => {
  await firebaseTesting.clearFirestoreData({ projectId });
  const adminApp = firebaseTesting.initializeAdminApp({ projectId }) as firebase.app.App;
  setAdminApp(adminApp as unknown as firebaseAdminType.app.App);

  expect((await adminApp.firestore().collection('i').doc('featured').get()).exists).toBeFalsy();

  await getPuzzlesForFeatured(0, 2);

  expect((await adminApp.firestore().collection('i').doc('featured').get()).exists).toBeFalsy();

  adminApp.delete();
});

test('try it with a few puzzles', async () => {
  await firebaseTesting.clearFirestoreData({ projectId });
  const adminApp = firebaseTesting.initializeAdminApp({ projectId }) as firebase.app.App;
  setAdminApp(adminApp as unknown as firebaseAdminType.app.App);

  expect((await adminApp.firestore().collection('i').doc('featured').get()).exists).toBeFalsy();

  await adminApp.firestore().collection('c').doc('featured1').set(getMockedPuzzle({ f: true }));
  await adminApp.firestore().collection('c').doc('nonfeatured').set(getMockedPuzzle());
  await adminApp.firestore().collection('c').doc('featured2').set(getMockedPuzzle({ f: true }));
  await adminApp.firestore().collection('c').doc('featured3').set(getMockedPuzzle({ f: true }));

  let [page1] = await getPuzzlesForFeatured(0, 2);
  expect(page1.map(p => p.id)).toEqual(['featured3', 'featured2']);
  let [page2] = await getPuzzlesForFeatured(1, 2);
  expect(page2.map(p => p.id)).toEqual(['featured1']);

  expect((await adminApp.firestore().collection('i').doc('featured').get()).data() ?.i).toMatchSnapshot();

  await adminApp.firestore().collection('c').doc('featured4').set(getMockedPuzzle({ f: true }));
  await adminApp.firestore().collection('c').doc('nonfeatured2').set(getMockedPuzzle());
  await adminApp.firestore().collection('c').doc('featured5').set(getMockedPuzzle({ f: true }));

  [page1] = await getPuzzlesForFeatured(0, 2);
  expect(page1.map(p => p.id)).toEqual(['featured5', 'featured4']);
  [page2] = await getPuzzlesForFeatured(1, 2);
  expect(page2.map(p => p.id)).toEqual(['featured3', 'featured2']);

  expect((await adminApp.firestore().collection('i').doc('featured').get()).data() ?.i).toMatchSnapshot();

  adminApp.delete();
});
