#!/usr/bin/env ts-node-script

import * as admin from 'firebase-admin';

import serviceAccount from '../../serviceAccountKey.json';
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
});

async function grantAdminRole(userEmail: string): Promise<void> {
  const user = await admin.auth().getUserByEmail(userEmail);
  if (user.customClaims && (user.customClaims as any).admin === true) {
    return;
  }
  return admin.auth().setCustomUserClaims(user.uid, {
    admin: true,
  });
}

if (process.argv.length !== 3) {
  throw Error('Invalid use of makeAdmin. Usage: node makeAdmin.js <email>');
}
const email = process.argv[2];
grantAdminRole(email).then(() => {
  console.log(`User ${email} has been given admin role`);
  process.exit(0);
}).catch((err) => {
  console.log('Failed to grant user admin role: ' + err);
  process.exit(1);
});
