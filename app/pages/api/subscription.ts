import { NextApiRequest, NextApiResponse } from 'next';
import { getCollection } from '../../lib/firebaseAdminWrapper';
import { PathReporter } from '../../lib/pathReporter';
import { UnsubscribeFlags } from '../../lib/prefs';
import { SubscriptionParamsV, getSig } from '../../lib/subscriptions';

export default async function subscription(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.status(405).json({ statusCode: 405, message: 'POST only' });
    return;
  }

  const validationResult = SubscriptionParamsV.decode(req.query);
  if (validationResult._tag !== 'Right') {
    console.error(PathReporter.report(validationResult).join(','));
    res.status(400).json({ statusCode: 400, message: 'Bad params' });
    return;
  }

  const params = validationResult.right;
  const sig = await getSig(params.u);
  if (sig !== params.s) {
    res.status(403).json({ statusCode: 403, message: 'Bad sig' });
    return;
  }

  const unsubs: (keyof typeof UnsubscribeFlags)[] = [];
  if (typeof params.f === 'string') {
    unsubs.push(params.f);
  } else if (params.f) {
    unsubs.push(...params.f);
  }

  await getCollection('prefs').doc(params.u).set(
    {
      unsubs,
    },
    { merge: true }
  );

  res.redirect(
    303,
    `https://crosshare.org/subscription?u=${params.u}&s=${params.s}&m=1`
  );
}
