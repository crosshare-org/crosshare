#!/usr/bin/env -S npx tsx

import { command, oneOf, positional, run, string, subcommands } from 'cmd-ts';
import { DonationsListT, DonationsListV } from '../lib/dbtypes.js';
import { getCollection } from '../lib/firebaseAdminWrapper.js';
import { PathReporter } from '../lib/pathReporter.js';

const donationsCollection = getCollection('donations');

const validFields = ['username', 'userid'];

const print = command({
  name: 'print',
  args: {
    email: positional({ type: string, displayName: 'email' }),
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

    let success = false;
    for (let i = donations.d.length - 1; i >= 0; i -= 1) {
      const o = donations.d[i];
      if (o && o.e.trim().toLowerCase() === args.email.trim().toLowerCase()) {
        console.log(o);
        console.log(o.d.toDate());
        success = true;
        break;
      }
    }

    if (!success) {
      console.error('email not found in donors list');
      return;
    }
  },
});

const compact = command({
  name: 'compact',
  args: {},
  handler: async () => {
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
    const donations: DonationsListT = validationResult.right;
    await donationsCollection
      .doc(`history-${new Date().toISOString()}`)
      .set(donations);
    console.log('pre-compact length:', donations.d.length);

    // Reduce right so the newest entries are examined first. That way we use the most recent date.
    const compacted: DonationsListT = donations.d.reduceRight(
      (accumulator: DonationsListT, current) => {
        let found = false;
        for (const existing of accumulator.d) {
          // Compact anything for the same email in the same year
          if (existing.e !== current.e) continue;
          if (
            existing.d.toDate().getFullYear() !==
            current.d.toDate().getFullYear()
          )
            continue;
          found = true;
          existing.a += current.a;
          existing.r += current.r;
          existing.n = existing.n || current.n;
          existing.p = existing.p || current.p;
          if (current.u && !existing.u) {
            existing.u = current.u;
          }
        }
        if (!found) {
          accumulator.d.push(current);
        }
        return accumulator;
      },
      { d: [] }
    );
    compacted.d.reverse();
    console.log('post-compact length:', compacted.d.length);
    await donationsCollection.doc(`donations`).set(compacted);
  },
});

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

const byYear = command({
  name: 'byYear',
  args: {},
  handler: async () => {
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
    const donations: DonationsListT = validationResult.right;
    const byYear: Record<number, number> = {};
    for (const donation of donations.d) {
      const year = donation.d.toDate().getFullYear();
      if (byYear[year]) {
        byYear[year] += donation.r;
      } else {
        byYear[year] = donation.r;
      }
    }
    console.log(byYear);
  },
});

const cmd = subcommands({
  name: 'donations',
  cmds: { edit, print, compact, byYear },
});

void run(cmd, process.argv.slice(2));
