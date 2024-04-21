import { NextApiRequest, NextApiResponse } from 'next';
import { getClues, getDB } from '../../../lib/ginsberg';

const db = getDB(true);

export default async function clues(req: NextApiRequest, res: NextApiResponse) {
  const { word } = req.query;
  if (Array.isArray(word) || !word) {
    res.status(404).json({ statusCode: 404, message: 'bad word params' });
    return;
  }
  const clues = await getClues(db, word.toUpperCase());
  res.setHeader('X-Robots-Tag', 'noindex');
  res.setHeader('Cache-Control', 'public, max-age=172800, s-maxage=172800');
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(clues));
}
