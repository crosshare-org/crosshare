#!/usr/bin/env -S NODE_OPTIONS='--loader ts-node/esm --experimental-specifier-resolution=node' npx ts-node-script

import { getClient, sendEmail } from '../lib/email';

export async function sendTestEmail() {
  const client = await getClient();
  return sendEmail({
    client,
    userId: 'fSEwJorvqOMK5UhNMHa4mu48izl1',
    subject: 'Testing an email via SES',
    markdown: '**Here** is the body',
    oneClickUnsubscribeTag: 'all',
    campaign: 'test',
  });
}

sendTestEmail()
  .then(() => {
    console.log('Done');
  })
  .catch((e: unknown) => {
    console.error(e);
  });
