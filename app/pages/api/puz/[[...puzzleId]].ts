import { NextApiRequest, NextApiResponse } from 'next';
import { exportFile } from '../../../lib/converter';
import { getPuzzle } from '../../../lib/puzzleCache';

export default async function puz(req: NextApiRequest, res: NextApiResponse) {
  const { urlTokens } = req.query;
  const [ puzzleId ] = urlTokens || '';
  console.log('here we are');
  console.log(req.query);
  if (!puzzleId) {
    console.log('testing');
    return res
      .status(404)
      .json({ statusCode: 404, message: 'bad puzzle params', params: req.query });
  }
  const puzzle = await getPuzzle(puzzleId);
  if (!puzzle) {
    return res
      .status(404)
      .json({ statusCode: 404, message: 'failed to get puzzle' });
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
