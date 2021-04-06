#!/usr/bin/env -S npx ts-node-script

// import { AdminApp } from '../lib/firebaseWrapper';
export {};

if (process.argv.length !== 2) {
  throw Error('Invalid use of migrate. Usage: ./scripts/migrate.ts');
}

// const db = AdminApp.firestore();

async function runMigration() {
  console.log('Run migration here...');
}

runMigration().then(() => {
  console.log('Finished migration');
});
