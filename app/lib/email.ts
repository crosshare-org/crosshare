import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { toHtml } from 'hast-util-to-html';
import { getUser } from './firebaseAdminWrapper.js';
import { markdownToHast } from './markdown/markdown.js';
import { UnsubscribeFlags } from './prefs.js';
import { getSig } from './subscriptions.js';

export async function getAddress(userId: string): Promise<string | undefined> {
  try {
    const user = await getUser(userId);
    return user.email;
  } catch (e) {
    console.log(e);
    console.warn('error getting user ', userId);
    return undefined;
  }
}

const REGION = 'us-east-1';

export async function getClient() {
  const secretmanagerClient = new SecretManagerServiceClient();
  const [secretVersion] = await secretmanagerClient.accessSecretVersion({
    name: 'projects/603173482014/secrets/ses-key/versions/latest',
  });
  const [accessKeyId, secretAccessKey] = (
    secretVersion.payload?.data?.toString() ?? ''
  ).split(' ');
  if (!accessKeyId || !secretAccessKey) {
    throw new Error('Failed to load ses keys');
  }

  return new SESv2Client({
    region: REGION,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export type EmailClient = SESv2Client;

export const RATE_LIMIT = 13;

export const emailLink = (campaign: string, linkTo: string) =>
  `https://crosshare.org/${linkTo}#utm_source=crosshare&utm_medium=email&utm_campaign=${campaign}`;

const tagsToReplace: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
};

function replaceTag(tag: string) {
  return tagsToReplace[tag] || tag;
}

function safeForHtml(str: string) {
  return str.replace(/[&<>]/g, replaceTag);
}

export async function sendEmail({
  client,
  userId,
  subject,
  markdown,
  oneClickUnsubscribeTag,
  campaign,
  footerText,
}: {
  client: EmailClient;
  userId: string;
  subject: string;
  markdown: string;
  oneClickUnsubscribeTag: keyof typeof UnsubscribeFlags;
  campaign: string;
  footerText?: string;
}) {
  const toAddress = await getAddress(userId);
  if (!toAddress) {
    console.warn('missing to address for ', userId);
    return;
  }

  const sig = await getSig(userId);
  const link = emailLink(campaign, `subscription?u=${userId}&s=${sig}`);
  markdown =
    markdown.trim() +
    `\n\n\n\n---\n\nTo unsubscribe or manage your preferences [click here](${link})${
      footerText ? '. ' + footerText : ''
    }`;

  const message = new SendEmailCommand({
    Destination: { ToAddresses: [toAddress] },
    Content: {
      Simple: {
        Body: {
          Html: {
            Data: `<!DOCTYPE html>
          <html>
          <head>
          <meta http-equiv="Content-Type" content="text/html charset=UTF-8" />
          <title>${safeForHtml(subject || 'Crosshare Notifications')}</title>
          </head>
          <body>
          ${toHtml(
            markdownToHast({
              text: markdown,
            })
          )}
          </body>
          </html>`,
          },
          Text: { Data: markdown },
        },
        Subject: { Data: subject },
        Headers: [
          {
            Name: 'List-Unsubscribe',
            Value: `<https://crosshare.org/api/subscription?u=${userId}&s=${sig}&f=${oneClickUnsubscribeTag}>`,
          },
          {
            Name: 'List-Unsubscribe-Post',
            Value: 'List-Unsubscribe=One-Click',
          },
        ],
      },
    },
    FromEmailAddress: 'Mike from Crosshare <mike@crosshare.org>',
  });

  return client.send(message);
}
