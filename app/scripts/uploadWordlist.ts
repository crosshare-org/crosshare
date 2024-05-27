#!/usr/bin/env -S NODE_OPTIONS='--loader ts-node/esm --experimental-specifier-resolution=node' npx ts-node-script

import { getStorage } from 'firebase-admin/storage';
import { getAdminApp } from '../lib/firebaseAdminWrapper.js';

getStorage(getAdminApp())
  .bucket()
  .upload('worddb.json', { gzip: true })
  .then(() => {
    console.log('uploaded');
  });
