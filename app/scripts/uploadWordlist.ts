#!/usr/bin/env -S npx ts-node-script

import { AdminApp } from '../lib/firebaseWrapper';

AdminApp.storage()
  .bucket()
  .upload('worddb.json', { gzip: true })
  .then(() => {
    console.log('uploaded');
  });
