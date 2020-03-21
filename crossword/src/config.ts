import firebase from 'firebase/app';
import 'firebase/auth';


export const firebaseConfig = {
  apiKey: "AIzaSyBrmmBf91peVT5T_Z7N3z9oizsPH5u2pUc",
  authDomain: "auth.crosshare.org",
  databaseURL: "https://mdcrosshare.firebaseio.com",
  projectId: "mdcrosshare",
  storageBucket: "mdcrosshare.appspot.com",
  messagingSenderId: "603173482014",
  appId: "1:603173482014:web:98d7d820731b7c5eaa080f",
  measurementId: "G-LTLN7Z4XBS"
};

export const firebaseUiConfig = {
    signInFlow: 'popup',
    signInOptions: [firebase.auth.GoogleAuthProvider.PROVIDER_ID],
    callbacks: {
      signInSuccessWithAuthResult: () => false
    }
  }
