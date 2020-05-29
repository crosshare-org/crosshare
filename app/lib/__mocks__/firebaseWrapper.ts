const firebaseTesting = jest.requireActual('@firebase/testing');

export let App: firebase.app.App;

export const setApp = (app: firebase.app.App) => { App = app; };

export const AuthProvider = null;

export const DeleteSentinal = firebaseTesting.firestore.FieldValue.delete();

export const TimestampClass = firebaseTesting.firestore.Timestamp;
