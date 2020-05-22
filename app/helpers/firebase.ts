declare var firebase: typeof import('firebase');

// On the server we need to require firebase - on client it's done w/ script tags
if (typeof window === "undefined") {
  globalThis.firebase = require("firebase");
  require("firebase/firestore");
}

const firebaseConfig = {
  apiKey: "AIzaSyBrmmBf91peVT5T_Z7N3z9oizsPH5u2pUc",
  authDomain: "auth.crosshare.org",
  databaseURL: "https://mdcrosshare.firebaseio.com",
  projectId: "mdcrosshare",
  storageBucket: "mdcrosshare.appspot.com",
  messagingSenderId: "603173482014",
  appId: "1:603173482014:web:98d7d820731b7c5eaa080f",
  measurementId: "G-LTLN7Z4XBS"
};

// Initialize Firebase
export let App: firebase.app.App;
if (firebase.apps.length) {
  App = firebase.apps[0];
} else {
  App = firebase.initializeApp(firebaseConfig);
  if (typeof window !== "undefined") {
    if (process.env.NODE_ENV === 'production') {
      App.performance();
    }
  }
  // TODO emulator:
  //     if (process.env.REACT_APP_USE_FIREBASE_EMULATOR) {
  //       var db = firebaseApp.firestore();
  //       db.settings({
  //         host: "localhost:8080",
  //         ssl: false
  //       });
  //     }
}

export const AuthProvider = new firebase.auth.GoogleAuthProvider();

export const TimestampClass = firebase.firestore.Timestamp;
