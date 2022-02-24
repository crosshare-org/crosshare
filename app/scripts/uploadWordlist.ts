#!/usr/bin/env -S npx ts-node-script

import { AdminApp } from '../lib/firebaseAdminWrapper';
import { getStorage } from 'firebase-admin/storage';

getStorage(AdminApp)
  .bucket()
  .upload('worddb.json', { gzip: true })
  .then(() => {
    console.log('uploaded');
  });
