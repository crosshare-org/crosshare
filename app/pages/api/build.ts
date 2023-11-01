import { NextApiRequest, NextApiResponse } from 'next';

export default function build(_req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('X-Robots-Tag', 'noindex');
  res.setHeader('Cache-Control', 'public, max-age=172800, s-maxage=172800');
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ commit: process.env.NEXT_PUBLIC_COMMIT_HASH }));
}
