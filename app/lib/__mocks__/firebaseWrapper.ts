const firebaseTesting = jest.requireActual('@firebase/testing');

export const App = firebaseTesting.initializeTestApp({
  projectId: "mdcrosshare",
  auth: {
    uid: "anonymous-user-id", admin: false, firebase: {
      sign_in_provider: "anonymous"
    }
  }
});

var db = App.firestore();
db.settings({
  host: "localhost:8080",
  ssl: false
});

export const AuthProvider = null;

export const DeleteSentinal = firebaseTesting.firestore.FieldValue.delete();

export const TimestampClass = firebaseTesting.firestore.Timestamp;
