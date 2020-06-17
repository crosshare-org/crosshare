const firebaseTesting = jest.requireActual('@firebase/testing');

export let App: firebase.app.App;

export const setApp = (app: firebase.app.App) => { App = app; };

export const AuthProvider = null;

export const DeleteSentinal = firebaseTesting.firestore.FieldValue.delete();

export const TimestampClass = firebaseTesting.firestore.Timestamp;

let anonApp: firebase.app.App;
let anonUser: firebase.User;
export const setUpForSignInAnonymously = (app: firebase.app.App, user: firebase.User) => {
  anonApp = app;
  anonUser = user;
};

export const signInAnonymously = async () => {
  setApp(anonApp);
  return anonUser;
};
