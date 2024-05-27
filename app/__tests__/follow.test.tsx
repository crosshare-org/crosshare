/**
 * @jest-environment node
 */

import * as firebaseTesting from '@firebase/rules-unit-testing';
import type firebase from 'firebase/compat/app';
import type * as firebaseAdminType from 'firebase-admin';
import { FieldValue, setAdminApp } from '../lib/firebaseWrapper.js';

jest.mock('../lib/firebaseWrapper');

afterEach(() => {
  jest.clearAllMocks();
});

let randoApp: firebase.app.App, app: firebase.app.App, admin: firebase.app.App;

beforeAll(async () => {
  randoApp = firebaseTesting.initializeTestApp({
    projectId,
    auth: {
      uid: 'tom',
      firebase: {
        sign_in_provider: 'google.com',
      },
    },
  }) as firebase.app.App;
  app = firebaseTesting.initializeTestApp({
    projectId,
    auth: {
      uid: 'mike',
      firebase: {
        sign_in_provider: 'google.com',
      },
    },
  }) as firebase.app.App;
  admin = firebaseTesting.initializeAdminApp({
    projectId,
  }) as unknown as firebase.app.App;
  setAdminApp(admin as unknown as firebaseAdminType.app.App);
});

afterAll(async () => {
  await app.delete();
  await admin.delete();
  await randoApp.delete();
});

const projectId = 'followtest';

test('security rules for creating following', async () => {
  await firebaseTesting.clearFirestoreData({ projectId });

  // Fails if not correct user
  await firebaseTesting.assertFails(
    app
      .firestore()
      .collection('followers')
      .doc('blah')
      .set(
        {
          f: FieldValue.arrayUnion('tom'),
        },
        { merge: true }
      )
  );

  // Succeeds
  await firebaseTesting.assertSucceeds(
    app
      .firestore()
      .collection('followers')
      .doc('blah')
      .set(
        {
          f: FieldValue.arrayUnion('mike'),
        },
        { merge: true }
      )
  );

  const res = await admin.firestore().collection('followers').doc('blah').get();
  expect(res.data()?.f.sort()).toEqual(['mike']);
});

test('security rules for creating by unfollowing', async () => {
  await firebaseTesting.clearFirestoreData({ projectId });

  // Succeeds
  await firebaseTesting.assertSucceeds(
    app
      .firestore()
      .collection('followers')
      .doc('blah')
      .set(
        {
          f: FieldValue.arrayRemove('mike'),
        },
        { merge: true }
      )
  );

  const res = await admin.firestore().collection('followers').doc('blah').get();
  expect(res.data()?.f.sort()).toEqual([]);
});

test('security rules for updating following', async () => {
  await firebaseTesting.clearFirestoreData({ projectId });
  await admin
    .firestore()
    .collection('followers')
    .doc('randomauthorid')
    .set({ f: ['dummyid'] });

  // Can't skip an existing user
  await firebaseTesting.assertFails(
    app
      .firestore()
      .collection('followers')
      .doc('randomauthorid')
      .set(
        {
          f: ['mike'],
        },
        { merge: true }
      )
  );

  // Can't update for a different user
  await firebaseTesting.assertFails(
    app
      .firestore()
      .collection('followers')
      .doc('randomauthorid')
      .set(
        {
          f: FieldValue.arrayUnion('tom'),
        },
        { merge: true }
      )
  );

  // Can't update for a different user and ours
  await firebaseTesting.assertFails(
    app
      .firestore()
      .collection('followers')
      .doc('randomauthorid')
      .set(
        {
          f: FieldValue.arrayUnion('tom', 'mike'),
        },
        { merge: true }
      )
  );

  // Succeeds updating array
  await firebaseTesting.assertSucceeds(
    app
      .firestore()
      .collection('followers')
      .doc('randomauthorid')
      .set(
        {
          f: FieldValue.arrayUnion('mike'),
        },
        { merge: true }
      )
  );

  const res = await admin
    .firestore()
    .collection('followers')
    .doc('randomauthorid')
    .get();
  expect(res.data()?.f.sort()).toEqual(['dummyid', 'mike']);

  // Succeeds updating array w/ explicit list
  await firebaseTesting.assertSucceeds(
    app
      .firestore()
      .collection('followers')
      .doc('randomauthorid')
      .set(
        {
          f: ['mike', 'dummyid'],
        },
        { merge: true }
      )
  );

  // Succeeds removing from array w/ explicit list
  await firebaseTesting.assertSucceeds(
    app
      .firestore()
      .collection('followers')
      .doc('randomauthorid')
      .set(
        {
          f: ['dummyid'],
        },
        { merge: true }
      )
  );
});
