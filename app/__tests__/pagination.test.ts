/**
 * @jest-environment node
 */

import * as firebaseTesting from '@firebase/rules-unit-testing';
import type firebaseAdminType from 'firebase-admin';

import { setAdminApp, AdminTimestamp } from '../lib/firebaseWrapper';
import type firebase from 'firebase/app';

const projectId = 'paginationtests';

jest.mock('../lib/firebaseWrapper');

import {
  getPuzzlesForFeatured,
  getPuzzlesForConstructorPage,
} from '../lib/serverOnly';
import { getMockedPuzzle } from '../lib/testingUtils';

test('try it when empty', async () => {
  await firebaseTesting.clearFirestoreData({ projectId });
  const adminApp = firebaseTesting.initializeAdminApp({
    projectId,
  }) as firebase.app.App;
  setAdminApp((adminApp as unknown) as firebaseAdminType.app.App);

  expect(
    (await adminApp.firestore().collection('i').doc('featured').get()).exists
  ).toBeFalsy();

  await getPuzzlesForFeatured(0, 2);

  expect(
    (await adminApp.firestore().collection('i').doc('featured').get()).exists
  ).toBeFalsy();

  adminApp.delete();
});

test('try it with a few puzzles', async () => {
  await firebaseTesting.clearFirestoreData({ projectId });
  const adminApp = firebaseTesting.initializeAdminApp({
    projectId,
  }) as firebase.app.App;
  setAdminApp((adminApp as unknown) as firebaseAdminType.app.App);

  expect(
    (await adminApp.firestore().collection('i').doc('featured').get()).exists
  ).toBeFalsy();

  await adminApp
    .firestore()
    .collection('c')
    .doc('featured1')
    .set(getMockedPuzzle({ f: true }));
  await adminApp
    .firestore()
    .collection('c')
    .doc('nonfeatured')
    .set(getMockedPuzzle());

  await adminApp
    .firestore()
    .collection('c')
    .doc('featured2')
    .set(getMockedPuzzle({ f: true }));
  await adminApp
    .firestore()
    .collection('c')
    .doc('featured3')
    .set(getMockedPuzzle({ f: true }));

  let [page1, total] = await getPuzzlesForFeatured(0, 2);
  expect(page1.map((p) => p.id)).toEqual(['featured3', 'featured2']);
  expect(total).toEqual(3);
  let [page2] = await getPuzzlesForFeatured(1, 2);
  expect(page2.map((p) => p.id)).toEqual(['featured1']);

  expect(
    (await adminApp.firestore().collection('i').doc('featured').get()).data()?.i
  ).toMatchSnapshot();

  await adminApp
    .firestore()
    .collection('c')
    .doc('featured4')
    .set(getMockedPuzzle({ f: true }));
  await adminApp
    .firestore()
    .collection('c')
    .doc('nonfeatured2')
    .set(getMockedPuzzle());
  await adminApp
    .firestore()
    .collection('c')
    .doc('featured5')
    .set(getMockedPuzzle({ f: true }));

  [page1, total] = await getPuzzlesForFeatured(0, 2);
  expect(page1.map((p) => p.id)).toEqual(['featured5', 'featured4']);
  expect(total).toEqual(5);
  [page2] = await getPuzzlesForFeatured(1, 2);
  expect(page2.map((p) => p.id)).toEqual(['featured3', 'featured2']);

  expect(
    (await adminApp.firestore().collection('i').doc('featured').get()).data()?.i
  ).toMatchSnapshot();

  adminApp.delete();
});

test('try constructor page with some puzzles private or private until', async () => {
  await firebaseTesting.clearFirestoreData({ projectId });
  const adminApp = firebaseTesting.initializeAdminApp({
    projectId,
  }) as firebase.app.App;
  setAdminApp((adminApp as unknown) as firebaseAdminType.app.App);

  const uid = getMockedPuzzle()['a'];

  expect(
    (await adminApp.firestore().collection('i').doc(uid).get()).exists
  ).toBeFalsy();

  await adminApp
    .firestore()
    .collection('c')
    .doc('featured1')
    .set(getMockedPuzzle());
  await adminApp
    .firestore()
    .collection('c')
    .doc('hidden')
    .set(getMockedPuzzle({ pv: true }));

  await adminApp
    .firestore()
    .collection('c')
    .doc('featured2')
    .set(getMockedPuzzle());
  await adminApp
    .firestore()
    .collection('c')
    .doc('featured3')
    .set(getMockedPuzzle());

  let [page1, total] = await getPuzzlesForConstructorPage(uid, 0, 2);
  expect(page1.map((p) => p.id)).toEqual(['featured3', 'featured2']);
  expect(total).toEqual(3);
  let [page2] = await getPuzzlesForConstructorPage(uid, 1, 2);
  expect(page2.map((p) => p.id)).toEqual(['featured1']);

  expect(
    (await adminApp.firestore().collection('i').doc(uid).get()).data()?.i
  ).toMatchSnapshot();

  const hourAgo = new Date();
  hourAgo.setHours(hourAgo.getHours() - 1);
  const hourFromNow = new Date();
  hourFromNow.setHours(hourFromNow.getHours() + 1);

  await adminApp
    .firestore()
    .collection('c')
    .doc('featured4')
    .set(getMockedPuzzle({ pvu: AdminTimestamp.fromDate(hourAgo) }));
  await adminApp
    .firestore()
    .collection('c')
    .doc('nonfeatured2')
    .set(getMockedPuzzle({ pvu: AdminTimestamp.fromDate(hourFromNow) }));
  await adminApp
    .firestore()
    .collection('c')
    .doc('featured5')
    .set(getMockedPuzzle());

  [page1, total] = await getPuzzlesForConstructorPage(uid, 0, 2);
  expect(page1.map((p) => p.id)).toEqual(['featured5', 'featured3']);
  expect(total).toEqual(5);
  [page2] = await getPuzzlesForConstructorPage(uid, 1, 2);
  expect(page2.map((p) => p.id)).toEqual(['featured2', 'featured1']);
  const [page3] = await getPuzzlesForConstructorPage(uid, 2, 2);
  expect(page3.map((p) => p.id)).toEqual(['featured4']);

  expect(
    (await adminApp.firestore().collection('i').doc(uid).get()).data()?.i
  ).toMatchSnapshot();
  expect(
    (await adminApp.firestore().collection('i').doc(uid).get()).data()?.pv
  ).toMatchSnapshot();
  expect(
    (await adminApp.firestore().collection('i').doc(uid).get()).data()?.pvui
  ).toMatchSnapshot();

  adminApp.delete();
});

test('constructor page was failing for private until', async () => {
  await firebaseTesting.clearFirestoreData({ projectId });
  const adminApp = firebaseTesting.initializeAdminApp({
    projectId,
  }) as firebase.app.App;
  setAdminApp((adminApp as unknown) as firebaseAdminType.app.App);

  const uid = getMockedPuzzle()['a'];

  expect(
    (await adminApp.firestore().collection('i').doc(uid).get()).exists
  ).toBeFalsy();

  await adminApp
    .firestore()
    .collection('c')
    .doc('featured1')
    .set(getMockedPuzzle());
  await adminApp
    .firestore()
    .collection('c')
    .doc('hidden')
    .set(getMockedPuzzle({ pv: true }));

  await adminApp
    .firestore()
    .collection('c')
    .doc('featured2')
    .set(getMockedPuzzle());
  await adminApp
    .firestore()
    .collection('c')
    .doc('featured3')
    .set(getMockedPuzzle());

  let [page1, total] = await getPuzzlesForConstructorPage(uid, 0, 2);
  expect(page1.map((p) => p.id)).toEqual(['featured3', 'featured2']);
  expect(total).toEqual(3);
  let [page2] = await getPuzzlesForConstructorPage(uid, 1, 2);
  expect(page2.map((p) => p.id)).toEqual(['featured1']);

  expect(
    (await adminApp.firestore().collection('i').doc(uid).get()).data()?.i
  ).toMatchSnapshot();

  const hourAgo = new Date();
  hourAgo.setHours(hourAgo.getHours() - 1);
  const hourFromNow = new Date();
  hourFromNow.setHours(hourFromNow.getHours() + 1);

  await adminApp
    .firestore()
    .collection('c')
    .doc('featured4')
    .set(getMockedPuzzle({ pvu: AdminTimestamp.fromDate(hourAgo) }));
  await adminApp
    .firestore()
    .collection('c')
    .doc('nonfeatured2')
    .set(getMockedPuzzle({ pvu: AdminTimestamp.fromDate(hourFromNow) }));
  await adminApp
    .firestore()
    .collection('c')
    .doc('nonfeatured4')
    .set(getMockedPuzzle({ pvu: AdminTimestamp.fromDate(hourFromNow) }));
  await adminApp
    .firestore()
    .collection('c')
    .doc('nonfeatured5')
    .set(getMockedPuzzle({ pvu: AdminTimestamp.fromDate(hourFromNow) }));
  await adminApp
    .firestore()
    .collection('c')
    .doc('featured5')
    .set(getMockedPuzzle());

  [page1, total] = await getPuzzlesForConstructorPage(uid, 0, 2);
  expect(page1.map((p) => p.id)).toEqual(['featured5', 'featured3']);
  expect(total).toEqual(5);
  [page2] = await getPuzzlesForConstructorPage(uid, 1, 2);
  expect(page2.map((p) => p.id)).toEqual(['featured2', 'featured1']);
  const [page3] = await getPuzzlesForConstructorPage(uid, 2, 2);
  expect(page3.map((p) => p.id)).toEqual(['featured4']);

  expect(
    (await adminApp.firestore().collection('i').doc(uid).get()).data()?.i
  ).toMatchSnapshot();
  expect(
    (await adminApp.firestore().collection('i').doc(uid).get()).data()?.pv
  ).toMatchSnapshot();
  expect(
    (await adminApp.firestore().collection('i').doc(uid).get()).data()?.pvui
  ).toMatchSnapshot();

  adminApp.delete();
});
