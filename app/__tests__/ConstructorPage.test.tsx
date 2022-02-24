import * as firebaseTesting from '@firebase/rules-unit-testing';

import { setApp, setAdminApp } from '../lib/firebaseWrapper';
import { getUser, render, cleanup, fireEvent } from '../lib/testingUtils';
import { getMockedPuzzle } from '../lib/getMockedPuzzle';
import { AccountPage } from '../pages/account';
import waitForExpect from 'wait-for-expect';
jest.mock('../lib/firebaseWrapper');
import type firebase from 'firebase/compat/app';
import { userIdToPage } from '../lib/serverOnly';
import firebaseAdmin from 'firebase-admin';

jest.mock(
  'next/link',
  () =>
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    ({ children }) =>
      children
); // https://github.com/vercel/next.js/issues/16864

const projectId = 'constructorpagetests';

test('invalid constructor page', async () => {
  await firebaseTesting.clearFirestoreData({ projectId });
  const adminApp = firebaseTesting.initializeAdminApp({
    projectId,
  }) as unknown as firebase.app.App;
  await adminApp.firestore().collection('cp').doc('miked').set({ u: 'mike' });
  setAdminApp(adminApp as unknown as firebaseAdmin.app.App);

  const page = await userIdToPage('miked');
  expect(page).toBeNull();
});

test('create constructor page', async () => {
  const mike = getUser('mikeuserid', false);

  await firebaseTesting.clearFirestoreData({ projectId });
  const adminApp = firebaseTesting.initializeAdminApp({
    projectId,
  }) as unknown as firebase.app.App;
  await adminApp.firestore().collection('cp').doc('miked').set({ u: 'mike' });

  const app = firebaseTesting.initializeTestApp({
    projectId,
    auth: {
      uid: 'mikeuserid',
      firebase: {
        sign_in_provider: 'google.com',
      },
    },
  });

  setApp(app as firebase.app.App);

  let r = render(<AccountPage isAdmin={false} user={mike} />, { user: mike });
  expect(await r.findByText(/Start sharing your own puzzles/i)).toBeVisible();
  expect(r.queryByPlaceholderText(/username/i)).toBeNull();

  cleanup();
  // Just add a dummy constructed puzzle for this user
  await adminApp
    .firestore()
    .collection('c')
    .add(getMockedPuzzle({ a: 'mikeuserid' }));
  r = render(<AccountPage isAdmin={false} user={mike} />, { user: mike });
  expect(
    await r.findByPlaceholderText(/username/i, undefined, { timeout: 3000 })
  ).toBeVisible();
  expect(r.queryByText(/Start sharing your own puzzles/i)).toBeNull();

  fireEvent.change(r.getByPlaceholderText('username'), {
    target: { value: 'MikeD' },
  });
  fireEvent.click(r.getByText('Create', { exact: true }));

  expect(
    await r.findByText(/username is unavailable/i, undefined, { timeout: 3000 })
  ).toBeVisible();

  fireEvent.change(r.getByPlaceholderText('username'), {
    target: { value: 'TheREALMikeD' },
  });
  fireEvent.click(r.getByText('Create', { exact: true }));
  await r.findByText('Created successfully!', undefined, { timeout: 3000 });

  await waitForExpect(async () =>
    expect(
      (
        await adminApp.firestore().collection('cp').doc('therealmiked').get()
      ).data()?.u
    ).toEqual('mikeuserid')
  );

  cleanup();

  const s = render(
    <AccountPage
      isAdmin={false}
      user={mike}
      constructorPage={{
        id: 'MIKE',
        i: 'mike',
        b: 'My Bio',
        n: 'Mike D',
        u: 'mikeuserid',
      }}
    />,
    { user: mike }
  );

  expect(await s.findByText(/blog is live at/i)).toBeVisible();
  expect(await s.findByPlaceholderText(/username/i)).not.toBeVisible();
  expect(s.queryByText(/Start sharing your own puzzles/i)).toBeNull();

  app.delete();
  adminApp.delete();
});

test('security rules for constructor page creation', async () => {
  await firebaseTesting.clearFirestoreData({ projectId });
  const adminApp = firebaseTesting.initializeAdminApp({
    projectId,
  }) as unknown as firebase.app.App;
  await adminApp.firestore().collection('cp').doc('miked').set({ u: 'mike' });
  adminApp.delete();

  const app = firebaseTesting.initializeTestApp({
    projectId,
    auth: {
      uid: 'mikeuserid',
      firebase: {
        sign_in_provider: 'google.com',
      },
    },
  });

  // Fails if missing moderation flag
  await firebaseTesting.assertFails(
    app.firestore().collection('cp').doc('mytestusername').set({
      i: 'MyTestUsername',
      u: 'mikeuserid',
      n: 'Mike D',
      b: 'Some random bio text',
      t: firebaseTesting.firestore.FieldValue.serverTimestamp(),
    })
  );

  // Fails if username doesn't match docid
  await firebaseTesting.assertFails(
    app.firestore().collection('cp').doc('mytestusername').set({
      i: 'MyTestUsername_',
      u: 'mikeuserid',
      n: 'Mike D',
      b: 'Some random bio text',
      m: true,
      t: firebaseTesting.firestore.FieldValue.serverTimestamp(),
    })
  );

  // Fails if username too short
  await firebaseTesting.assertFails(
    app.firestore().collection('cp').doc('my').set({
      i: 'My',
      u: 'mikeuserid',
      n: 'Mike D',
      b: 'Some random bio text',
      m: true,
      t: firebaseTesting.firestore.FieldValue.serverTimestamp(),
    })
  );

  // Fails if username is reserved
  await firebaseTesting.assertFails(
    app.firestore().collection('cp').doc('admin').set({
      i: 'admin',
      u: 'mikeuserid',
      n: 'Mike D',
      b: 'Some random bio text',
      m: true,
      t: firebaseTesting.firestore.FieldValue.serverTimestamp(),
    })
  );

  // Fails if special char in username
  await firebaseTesting.assertFails(
    app.firestore().collection('cp').doc('admin!').set({
      i: 'admin!',
      u: 'mikeuserid',
      n: 'Mike D',
      b: 'Some random bio text',
      m: true,
      t: firebaseTesting.firestore.FieldValue.serverTimestamp(),
    })
  );

  // Fails if username is already claimed
  await firebaseTesting.assertFails(
    app.firestore().collection('cp').doc('miked').set({
      i: 'MikeD',
      u: 'mikeuserid',
      n: 'Mike D',
      b: 'Some random bio text',
      m: true,
      t: firebaseTesting.firestore.FieldValue.serverTimestamp(),
    })
  );

  // Fails if username is longer than 20 chars
  await firebaseTesting.assertFails(
    app.firestore().collection('cp').doc('mytestusernameaa').set({
      i: 'MyTestUsernameaaaaaaa',
      u: 'mikeuserid',
      n: 'Mike D',
      b: 'Some random bio text',
      m: true,
      t: firebaseTesting.firestore.FieldValue.serverTimestamp(),
    })
  );

  // Fails if user id doesn't match account
  await firebaseTesting.assertFails(
    app.firestore().collection('cp').doc('mytestusername').set({
      i: 'MyTestUsername',
      u: 'foobar',
      n: 'Mike D',
      b: 'Some random bio text',
      m: true,
      t: firebaseTesting.firestore.FieldValue.serverTimestamp(),
    })
  );

  // Fails if missing name
  await firebaseTesting.assertFails(
    app.firestore().collection('cp').doc('mytestusername').set({
      i: 'MyTestUsername',
      u: 'mikeuserid',
      n: '',
      b: 'Some random bio text',
      m: true,
      t: firebaseTesting.firestore.FieldValue.serverTimestamp(),
    })
  );

  // Fails if using old timestamp
  await firebaseTesting.assertFails(
    app
      .firestore()
      .collection('cp')
      .doc('mytestusername')
      .set({
        i: 'MyTestUsername',
        u: 'mikeuserid',
        n: 'Mike D',
        b: 'Some random bio text',
        m: true,
        t: firebaseTesting.firestore.Timestamp.fromDate(
          new Date(Date.UTC(2020, 0, 1, 7))
        ),
      })
  );

  // SUCCEEDS!
  await firebaseTesting.assertSucceeds(
    app.firestore().collection('cp').doc('mytestusername').set({
      i: 'MyTestUsername',
      u: 'mikeuserid',
      n: 'Mike D',
      b: 'Some random bio text',
      m: true,
      t: firebaseTesting.firestore.FieldValue.serverTimestamp(),
    })
  );

  /* TODO Should fail if user already has another page
  Right now we don't have a way to prevent this - we probably need another table
  that indexes from userid => username and use batch write to write both at once.

  await firebaseTesting.assertFails(
    app.firestore().collection('cp').doc('mytestusername2').set({
      i: 'MyTestUsername2',
      u: 'mikeuserid',
      n: 'Mike D',
      b: 'Some random bio text',
      m: true,
      t: firebaseTesting.firestore.FieldValue.serverTimestamp(),
    })
  ); */

  app.delete();
});

test('security rules for constructor page updates', async () => {
  await firebaseTesting.clearFirestoreData({ projectId });
  const adminApp = firebaseTesting.initializeAdminApp({
    projectId,
  }) as unknown as firebase.app.App;
  await adminApp.firestore().collection('cp').doc('miked').set({
    i: 'miked',
    u: 'foobar',
    n: 'Alt Name',
    b: 'Some random bio text',
    t: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
  });

  const app = firebaseTesting.initializeTestApp({
    projectId,
    auth: {
      uid: 'mikeuserid',
      firebase: {
        sign_in_provider: 'google.com',
      },
    },
  });

  // SUCCEEDS!
  await firebaseTesting.assertSucceeds(
    app.firestore().collection('cp').doc('mytestusername').set({
      i: 'MyTestUsername',
      u: 'mikeuserid',
      n: 'Mike D',
      b: 'Some random bio text',
      m: true,
      t: firebaseTesting.firestore.FieldValue.serverTimestamp(),
    })
  );

  // Can update bio text
  await firebaseTesting.assertSucceeds(
    app.firestore().collection('cp').doc('mytestusername').set(
      {
        b: 'Some new bio text',
        m: true,
        t: firebaseTesting.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    )
  );

  // Can't update bio text w/o timestamp
  await firebaseTesting.assertFails(
    app.firestore().collection('cp').doc('mytestusername').set(
      {
        b: 'Some new bio text',
        m: true,
      },
      { merge: true }
    )
  );

  // Can't update bio text w/o moderation flag
  await firebaseTesting.assertFails(
    app.firestore().collection('cp').doc('mytestusername').set(
      {
        b: 'Some new bio text',
        m: false,
        t: firebaseTesting.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    )
  );

  // Can't update bio text for different user
  await firebaseTesting.assertFails(
    app.firestore().collection('cp').doc('miked').set(
      {
        b: 'Some new bio text',
        m: true,
        t: firebaseTesting.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    )
  );

  // Can't update userid for different user
  await firebaseTesting.assertFails(
    app.firestore().collection('cp').doc('miked').set(
      {
        u: 'mikeuserid',
        m: true,
        t: firebaseTesting.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    )
  );

  // Can't change username
  await firebaseTesting.assertFails(
    app.firestore().collection('cp').doc('mytestusername').set(
      {
        i: 'mytestuser',
        m: true,
        t: firebaseTesting.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    )
  );

  // Can change case though
  await firebaseTesting.assertSucceeds(
    app.firestore().collection('cp').doc('mytestusername').set(
      {
        i: 'MYTESTUSERNAME',
        m: true,
        t: firebaseTesting.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    )
  );

  // Can't delete name
  await firebaseTesting.assertFails(
    app.firestore().collection('cp').doc('mytestusername').set(
      {
        n: '',
        m: true,
        t: firebaseTesting.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    )
  );

  // Can change name though
  await firebaseTesting.assertSucceeds(
    app.firestore().collection('cp').doc('mytestusername').set(
      {
        n: 'New Display Name',
        m: true,
        t: firebaseTesting.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    )
  );

  const data = (
    await adminApp.firestore().collection('cp').doc('mytestusername').get()
  ).data();
  if (data === undefined) {
    throw new Error('botch');
  }
  const { t, ...toSnapshot } = data;
  expect(t).not.toBeFalsy();
  expect(toSnapshot).toMatchSnapshot();

  adminApp.delete();
  app.delete();
});
