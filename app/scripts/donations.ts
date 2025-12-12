#!/usr/bin/env -S npx tsx

import { command, oneOf, positional, run, string, subcommands } from 'cmd-ts';
import { DonationsListV } from '../lib/dbtypes.js';
import { getCollection } from '../lib/firebaseAdminWrapper.js';
import { PathReporter } from '../lib/pathReporter.js';

const donationsCollection = getCollection('donations');

const validFields = ['username', 'userid'];

const edit = command({
  name: 'edit',
  args: {
    email: positional({ type: string, displayName: 'email' }),
    field: positional({
      type: oneOf(validFields),
      displayName: 'field to update',
    }),
    value: positional({
      type: string,
      displayName: 'new value',
    }),
  },
  handler: async (args) => {
    const dbres = await donationsCollection.doc(`donations`).get();
    if (!dbres.exists) {
      console.error('no donations doc');
      return;
    }
    const validationResult = DonationsListV.decode(dbres.data());
    if (validationResult._tag !== 'Right') {
      console.error(PathReporter.report(validationResult).join(','));
      return;
    }
    const donations = validationResult.right;

    if (!validFields.includes(args.field)) {
      console.error('unimplemented!');
      return;
    }

    let success = false;
    for (let i = donations.d.length - 1; i >= 0; i -= 1) {
      const o = donations.d[i];
      if (o && o.e.trim().toLowerCase() === args.email.trim().toLowerCase()) {
        if (args.field === 'username') {
          o.p = args.value.trim();
        } else if (args.field === 'userid') {
          o.u = args.value.trim();
        }
        console.log(o);
        success = true;
        break;
      }
    }

    if (!success) {
      console.error('email not found in donors list');
      return;
    }

    await donationsCollection.doc(`donations`).set(donations);
    console.log('updated');
  },
});

const cmd = subcommands({
  name: 'donations',
  cmds: { edit },
});

void run(cmd, process.argv.slice(2));
