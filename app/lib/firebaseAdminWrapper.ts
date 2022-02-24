import { App, initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { firebaseConfig } from '../firebaseConfig';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

export let AdminApp = initializeApp({
  ...firebaseConfig,
  credential: applicationDefault(),
});

export const setAdminApp = (app: App) => {
  AdminApp = app;
};

export const getUser = (userId: string) => getAuth(AdminApp).getUser(userId);

export const AdminTimestamp = Timestamp;

export const firestore = () => getFirestore(AdminApp);
