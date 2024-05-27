import { NextApiRequest, NextApiResponse } from 'next';
import { exportFile } from '../../../lib/converter.js';
import { getPuzzle } from '../../../lib/puzzleCache.js';

export default async function puz(req: NextApiRequest, res: NextApiResponse) {
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
  if (puzzle.vb?.length ?? puzzle.hb?.length) {
    res.status(400).json({
      statusCode: 400,
      message: '.puz is currently unsupported for barred grids',
    });
    return;
  }
  res.setHeader('X-Robots-Tag', 'noindex');
  res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=3600');
  res.setHeader(
    'Content-Disposition',
    'inline; filename="' + puzzle.t.replace(/[^\w ]/g, '') + '.puz"'
  );
  res.writeHead(200, { 'Content-Type': 'application/x-crossword' });
  res.end(Buffer.from(exportFile(puzzle)));
}
