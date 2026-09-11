import { NextApiRequest, NextApiResponse } from 'next';
import { exportIpuz } from '../../../lib/converter.js';
import { getPuzzle } from '../../../lib/serverOnly.js';

export default async function ipuz(req: NextApiRequest, res: NextApiResponse) {
  const { puzzleId } = req.query;
  if (Array.isArray(puzzleId) || !puzzleId) {
    res.status(404).json({ statusCode: 404, message: 'bad puzzle params' });
    return;
  }
  const puzzle = await getPuzzle(puzzleId);
  if (!puzzle) {
    res.status(404).json({ statusCode: 404, message: 'failed to get puzzle' });
    return;
  }
  if (puzzle.pk) {
    res
      .status(403)
      .json({ statusCode: 403, message: 'no .ipuz for pack puzzles' });
    return;
  }
  res.setHeader('X-Robots-Tag', 'noindex');
  res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=3600');
  res.setHeader(
    'Content-Disposition',
    'inline; filename="' + puzzle.t.replace(/[^\w ]/g, '') + '.ipuz"'
  );
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(Buffer.from(exportIpuz(puzzle)));
}
