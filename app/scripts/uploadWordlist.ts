#!/usr/bin/env -S NODE_OPTIONS='--loader ts-node/esm --experimental-specifier-resolution=node' npx ts-node-script

import { getAdminApp } from '../lib/firebaseAdminWrapper';
import { getStorage } from 'firebase-admin/storage';

getStorage(getAdminApp())
  .bucket()
  .upload('worddb.json', { gzip: true })
  .then(() => {
    console.log('uploaded');
  });
