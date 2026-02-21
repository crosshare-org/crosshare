#!/usr/bin/env -S npx tsx

import { command, run, subcommands } from 'cmd-ts';
import { BarebonesCacheT, ConstructorPageV } from '../lib/constructorPage.js';
import { getCollection, mapEachResult } from '../lib/firebaseAdminWrapper.js';

const rebuild = command({
  name: 'rebuild',
  args: {},
  handler: async () => {
    console.log('building new cache');
    const cache: BarebonesCacheT = {};
    try {
      await mapEachResult(
        getCollection('cp'),
        ConstructorPageV,
        (cp, _docId) => {
          cache[cp.u] = { i: cp.i, n: cp.n };
        }
      );
    } catch (e) {
      console.error('error updating constructor pages');
      console.error(e);
    }
    console.log('storing');
    await getCollection('cache').doc('barebonesConstructorPages').set(cache);
  },
});

const cmd = subcommands({
  name: 'caching',
  cmds: { rebuild },
});

void run(cmd, process.argv.slice(2));
