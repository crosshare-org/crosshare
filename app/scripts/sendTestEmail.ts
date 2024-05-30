#!/usr/bin/env -S npx tsx

import { getClient, sendEmail } from '../lib/email.js';

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
