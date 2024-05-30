#!/usr/bin/env -S npx tsx

import { getStorage } from 'firebase-admin/storage';
import { getAdminApp } from '../lib/firebaseAdminWrapper.js';

getStorage(getAdminApp())
  .bucket()
  .upload('worddb.json', { gzip: true })
  .then(() => {
    console.log('uploaded');
  })
  .catch((e: unknown) => {
    console.error(e);
  });
