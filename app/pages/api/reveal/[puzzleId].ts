import { getAuth } from 'firebase-admin/auth';
import { Timestamp } from 'firebase-admin/firestore';
import * as t from 'io-ts';
import { NextApiRequest, NextApiResponse } from 'next';
import { DBPuzzleT } from '../../../lib/dbtypes.js';
import {
  getAdminApp,
  getCollection,
} from '../../../lib/firebaseAdminWrapper.js';
import { PathReporter } from '../../../lib/pathReporter.js';
import { getPuzzle } from '../../../lib/puzzleCache.js';

const ParamsV = t.type({
  puzzleId: t.string,
  displayName: t.string,
  token: t.string,
});

function revealSolutions(res: NextApiResponse, puzzle: DBPuzzleT) {
  res.setHeader('X-Robots-Tag', 'noindex');
  res.setHeader('Cache-Control', 'public, max-age=172800, s-maxage=172800');
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ solutions: puzzle.ct_ans }));
}

export default async function reveal(
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

  const { puzzleId, token, displayName } = validationResult.right;
  const uid = (await getAuth(getAdminApp()).verifyIdToken(token)).uid;

  const puzzle = await getPuzzle(puzzleId);
  if (!puzzle) {
    res.status(404).json({ statusCode: 404, message: 'failed to get puzzle' });
    return;
  }

  if (!puzzle.ct_ans?.length) {
    res.status(400).json({ statusCode: 400, message: 'puzzle is not a meta' });
    return;
  }

  if (puzzle.a === uid) {
    revealSolutions(res, puzzle);
    return;
  }

  const publishDate = (puzzle.pvu ?? puzzle.p).toMillis();
  if (
    puzzle.ct_rv_dl &&
    Timestamp.now().toMillis() < publishDate + puzzle.ct_rv_dl
  ) {
    res.status(403).json({ statusCode: 403, message: 'reveal disabled' });
    return;
  }

  await getCollection('p').doc(`${puzzleId}-${uid}`).update({
    ct_rv: true,
    ct_t: Timestamp.now(),
    ct_n: displayName,
  });
  revealSolutions(res, puzzle);
}
