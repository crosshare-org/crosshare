import { NextApiRequest, NextApiResponse } from 'next';
import { AdminApp } from '../../../lib/firebaseWrapper';
import { validate } from '../../../lib/constructorPage';
import { paginatedPuzzles } from '../../../lib/paginatedPuzzles';
import { Feed } from 'feed';
import { htmlOutput, parser } from '../../../components/Markdown';

export default async function constructorFeed(req: NextApiRequest, res: NextApiResponse) {
  const { username } = req.query;
  if (!username || Array.isArray(username)) {
    return res.status(404).json({ statusCode: 404, message: 'bad params' });
  }
  const db = AdminApp.firestore();
  let dbres;
  try {
    dbres = await db.collection('cp').doc(username.toLowerCase()).get();
  } catch {
    return res.status(404).json({ statusCode: 404, message: 'error loading constructor' });
  }
  if (!dbres.exists) {
    return res.status(404).json({ statusCode: 404, message: 'constructor does not exist' });
  }

  const cp = validate(dbres.data(), username.toLowerCase());
  if (!cp) {
    return res.status(404).json({ statusCode: 404, message: 'invalid constructor' });
  }

  const [puzzles] = await paginatedPuzzles(
    0,
    10,
    'a',
    cp.u,
  );

  const feed = new Feed({
    id: `https://crosshare.org/${cp.i}`,
    link: `https://crosshare.org/${cp.i}`,
    feed: `https://crosshare.org/api/feed/${cp.i}`,
    title: `${cp.n} (@${cp.i}) | Crosshare crossword puzzles`,
    copyright: `All rights reserved, ${cp.n} and Crosshare.org`,
    description: `The latest crossword puzzles from ${cp.n}`,
    generator: 'crosshare',
    author: {
      name: cp.n,
      link: `https://crosshare.org/${cp.i}`,
    }
  });

  puzzles.forEach(p => {
    const link = `https://crosshare.org/crosswords/${p.id}`;
    feed.addItem({
      title: p.title,
      id: link,
      link: link,
      date: new Date(p.isPrivateUntil || p.publishTime),
      description: p.blogPost ? htmlOutput(parser(p.blogPost + `\n\n[Solve on Crosshare](${link})`)) : `<a href='${link}'>Solve on Crosshare</a>`,
    });
  });

  res.setHeader('Cache-Control', 'public, max-age=172800, s-maxage=172800');
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/xml; charset=utf-8');
  res.end(feed.rss2());
}
