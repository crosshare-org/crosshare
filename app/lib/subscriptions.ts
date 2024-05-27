import crypto from 'node:crypto';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import * as t from 'io-ts';
import { UnsubscribeFlags } from './prefs.js';

export const SubscriptionParamsV = t.type({
  /** signature */
  s: t.string,
  /** user id */
  u: t.string,
  /** new setting for unsubs */
  f: t.union([
    t.undefined,
    t.keyof(UnsubscribeFlags),
    t.array(t.keyof(UnsubscribeFlags)),
  ]),
});

export async function getSig(userId: string): Promise<string> {
  const secretmanagerClient = new SecretManagerServiceClient();
  const [secretVersion] = await secretmanagerClient.accessSecretVersion({
    name: 'projects/603173482014/secrets/subscription-management-key/versions/latest',
  });
  const secret = secretVersion.payload?.data?.toString();
  if (!secret) {
    throw new Error('Failed to load secret');
  }

  return crypto.createHmac('sha256', secret).update(userId).digest('base64url');
}
