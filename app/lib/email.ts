import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { getUser } from './firebaseAdminWrapper';

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

  return new SESClient({
    region: REGION,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export type EmailClient = SESClient;

export const RATE_LIMIT = 13;

export async function sendEmail({
  client,
  userId,
  subject,
  text,
  html,
}: {
  client: SESClient;
  userId: string;
  subject: string;
  text: string;
  html: string;
}) {
  const toAddress = await getAddress(userId);
  if (!toAddress) {
    console.warn('missing to address for ', userId);
    return;
  }

  const message = new SendEmailCommand({
    Destination: { ToAddresses: [toAddress] },
    Message: {
      Body: {
        Html: { Data: html },
        Text: { Data: text },
      },
      Subject: { Data: subject },
    },
    Source: 'Mike from Crosshare <mike@crosshare.org>',
  });

  return client.send(message);
}
