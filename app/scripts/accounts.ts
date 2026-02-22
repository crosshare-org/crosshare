#!/usr/bin/env -S npx tsx

import fs from 'node:fs';
import util from 'node:util';
import { command, option, optional, run, string, subcommands } from 'cmd-ts';
import { parse } from 'csv-parse/sync';
import { FirebaseAuthError, getAuth } from 'firebase-admin/auth';
import { getAdminApp } from '../lib/firebaseAdminWrapper';

const readFile = util.promisify(fs.readFile);

const cutoff = 1000 * 60 * 60 * 24 * 31;
const auth = getAuth(getAdminApp());

const clean = command({
  name: 'clean',
  description: 'remove old anonymous accounts',
  args: {
    from: option({ type: optional(string), long: 'from' }),
  },
  handler: async (args) => {
    let count = 0;
    let skip = 0;
    let sawUID = false;
    return readFile('accounts.csv').then(async (binary) => {
      const csv: string[][] = parse(binary, {
        quote: null,
        escape: null,
        relax_column_count: true,
      }).filter((r: string[]) => !r[1]); // Look for no email
      for (const r of csv) {
        const uid = r[0];
        if (!uid || r[1]) {
          continue;
        }
        if (args.from) {
          if (args.from === uid) {
            sawUID = true;
            continue;
          }
          if (!sawUID) {
            continue;
          }
        }
        const lastSignInString = r[24];
        if (!lastSignInString) {
          console.error('missing last sign in', r);
          continue;
        }
        if (Date.now() - parseInt(lastSignInString) < cutoff) {
          skip += 1;
          continue;
        }
        count += 1;
        if (count % 100 === 0) {
          console.log(count, uid);
        }
        await auth
          .getUser(uid)
          .then(async (userRecord) => {
            if (userRecord.email) {
              console.error('user has email', uid);
            } else {
              await auth.deleteUser(uid);
            }
          })
          .catch((error: unknown) => {
            const err = error instanceof FirebaseAuthError;
            if (err && error.code !== 'auth/user-not-found') {
              console.log('Error fetching user data:', error);
            }
          });
      }

      console.log('skipped', skip);
      console.log('deleted', count);
    });
  },
});

const cmd = subcommands({
  name: 'accounts',
  cmds: { clean },
});

void run(cmd, process.argv.slice(2));
