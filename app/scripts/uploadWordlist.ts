#!/usr/bin/env -S npx ts-node-script --skip-project -O '{"resolveJsonModule":true,"esModuleInterop":true,"noUncheckedIndexedAccess":true,"strict":true}'

import { AdminApp } from '../lib/firebaseWrapper';

AdminApp.storage()
  .bucket()
  .upload('worddb.json')
  .then(() => {
    console.log('uploaded');
  });
