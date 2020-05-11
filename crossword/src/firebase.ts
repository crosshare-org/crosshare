import type firebase from 'firebase';

export type FirebaseApp = firebase.app.App;
export type FirebaseTimestamp = firebase.firestore.Timestamp;
export type FirebaseTimestampClass = typeof firebase.firestore.Timestamp;
export type FirebaseGoogleAuthProvider = firebase.auth.GoogleAuthProvider;
export type FirebaseFieldValue = firebase.firestore.FieldValue;

const ERROR = 'Must initialize firebase first!';

let firebaseApp: FirebaseApp | undefined = undefined;
export function getFirebaseApp(): FirebaseApp {
  if (firebaseApp === undefined) {
    throw new Error(ERROR);
  }
  return firebaseApp;
}

let timestampClass: FirebaseTimestampClass | undefined;
export function getTimestampClass(): FirebaseTimestampClass {
  if (timestampClass === undefined) {
    throw new Error(ERROR);
  }
  return timestampClass;
}

let googleAuthProvider: FirebaseGoogleAuthProvider | null = null;
export function getGoogleAuthProvider(): FirebaseGoogleAuthProvider {
  if (!googleAuthProvider) {
    throw new Error(ERROR);
  }
  return googleAuthProvider;
}

let deleteSentinal: FirebaseFieldValue;
export function getDeleteSentinal(): FirebaseFieldValue {
  if (deleteSentinal === undefined) {
    throw new Error(ERROR);
  }
  return deleteSentinal;
}

export let useAuthState: () => [firebase.User | undefined, boolean, firebase.auth.Error | undefined];

export function initFirebase(
  initFirebaseApp: FirebaseApp,
  initTimestampClass: FirebaseTimestampClass,
  initGoogleAuthProvider: FirebaseGoogleAuthProvider | null,
  initDeleteSentinal: FirebaseFieldValue,
  initUseAuthState: () => [firebase.User | undefined, boolean, firebase.auth.Error | undefined]
) {
  firebaseApp = initFirebaseApp;
  timestampClass = initTimestampClass;
  googleAuthProvider = initGoogleAuthProvider;
  deleteSentinal = initDeleteSentinal;
  useAuthState = initUseAuthState;
}
