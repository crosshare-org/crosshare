import * as firebaseTesting from '@firebase/testing';

const projectId = 'constructorpagetests';

test('security rules for constructor page creation', async () => {
  await firebaseTesting.clearFirestoreData({ projectId });
  const adminApp = firebaseTesting.initializeAdminApp({ projectId }) as firebase.app.App;
  await adminApp.firestore().collection('cp').doc('miked').set({ u: 'mike' });
  adminApp.delete();

  const app = firebaseTesting.initializeTestApp({
    projectId,
    auth: {
      uid: 'mikeuserid',
      admin: false,
      firebase: {
        sign_in_provider: 'google.com',
      },
    },
  });

  // Fails if username doesn't match docid
  await firebaseTesting.assertFails(
    app.firestore().collection('cp').doc('mytestusername').set({
      i: 'MyTestUsername_',
      u: 'mikeuserid',
      n: 'Mike D',
      b: 'Some random bio text',
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
      t: firebaseTesting.firestore.FieldValue.serverTimestamp(),
    })
  );

  // Fails if username is longer than 15 chars
  await firebaseTesting.assertFails(
    app.firestore().collection('cp').doc('mytestusernameaa').set({
      i: 'MyTestUsernameaa',
      u: 'mikeuserid',
      n: 'Mike D',
      b: 'Some random bio text',
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
      t: firebaseTesting.firestore.FieldValue.serverTimestamp(),
    })
  );

  // Fails if using old timestamp
  await firebaseTesting.assertFails(
    app.firestore().collection('cp').doc('mytestusername').set({
      i: 'MyTestUsername',
      u: 'mikeuserid',
      n: 'Mike D',
      b: 'Some random bio text',
      t: firebaseTesting.firestore.Timestamp.fromDate(new Date('2020-01-01'))
    })
  );

  // SUCCEEDS!
  await firebaseTesting.assertSucceeds(
    app.firestore().collection('cp').doc('mytestusername').set({
      i: 'MyTestUsername',
      u: 'mikeuserid',
      n: 'Mike D',
      b: 'Some random bio text',
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
      t: firebaseTesting.firestore.FieldValue.serverTimestamp(),
    })
  ); */

  app.delete();
});
