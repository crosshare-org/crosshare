import { getAuth } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';
import * as t from 'io-ts';
import { NextApiRequest, NextApiResponse } from 'next';
import { firestore, getAdminApp } from '../../lib/firebaseAdminWrapper.js';
import { PathReporter } from '../../lib/pathReporter.js';
import { timestamp } from '../../lib/timestamp.js';

const ParamsV = t.type({
  packId: t.string,
  code: t.string,
  token: t.string,
});

const InviteV = t.type({
  /** pack id */
  p: t.string,
  /** code */
  c: t.string,
  /** created */
  ca: timestamp,
  /** used */
  u: t.union([timestamp, t.null]),
  /** email */
  e: t.union([t.string, t.null]),
  /** email sent */
  es: t.union([timestamp, t.null]),
});

export default async function addpack(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.status(405).json({ statusCode: 405, message: 'POST only' });
    return;
  }

  const validationResult = ParamsV.decode(req.query);
  if (validationResult._tag !== 'Right') {
    console.error(PathReporter.report(validationResult).join(','));
    res.status(400).json({ statusCode: 400, message: 'Bad params' });
    return;
  }

  const params = validationResult.right;

  const uid = (await getAuth(getAdminApp()).verifyIdToken(params.token)).uid;

  const db = firestore();
  const inviteRef = db.collection('in').doc(`${params.packId}-${params.code}`);
  const prefsRef = db.collection('prefs').doc(uid);

  if (
    await db.runTransaction(async (t) => {
      const inviteRes = await t.get(inviteRef);

      const vr = InviteV.decode(inviteRes.data());
      if (vr._tag !== 'Right') {
        console.error(PathReporter.report(validationResult).join(','));
        res.status(403).json({ statusCode: 403, message: 'Bad invite' });
        return true;
      }

      const invite = vr.right;
      if (invite.u) {
        console.error(PathReporter.report(validationResult).join(','));
        res.status(403).json({ statusCode: 403, message: 'Used' });
        return true;
      }

      t.update(inviteRef, { u: FieldValue.serverTimestamp() });
      t.set(
        prefsRef,
        { packs: FieldValue.arrayUnion(params.packId) },
        { merge: true }
      );
      return false;
    })
  ) {
    return;
  }

  res.status(200).json({ statusCode: 200, message: 'Access granted' });
  return;
}
