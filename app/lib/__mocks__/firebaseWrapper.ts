const firebaseTesting = jest.requireActual('@firebase/testing');

export let App = firebaseTesting.initializeTestApp({
  projectId: "crosshare-test",
  auth: {
    uid: "anonymous-user-id", admin: false, firebase: {
      sign_in_provider: "anonymous"
    }
  }
});

export const setApp = (app: firebase.app.App) => { App = app };

export const AuthProvider = null;

export const DeleteSentinal = firebaseTesting.firestore.FieldValue.delete();

export const TimestampClass = firebaseTesting.firestore.Timestamp;
