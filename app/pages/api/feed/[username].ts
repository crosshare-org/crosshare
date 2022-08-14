import { NextApiRequest, NextApiResponse } from 'next';
import { validate } from '../../../lib/constructorPage';
import { paginatedPuzzles } from '../../../lib/paginatedPuzzles';
import { slugify } from '../../../lib/utils';
import { Feed } from 'feed';
import { getCollection } from '../../../lib/firebaseAdminWrapper';
import { toHtml } from 'hast-util-to-html';
import { markdownToHast } from '../../../lib/markdown/markdown';

export default async function constructorFeed(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { username } = req.query;
  if (Array.isArray(username) || !username) {
    return res.status(404).json({ statusCode: 404, message: 'bad params' });
  }
  let dbres;
  try {
    dbres = await getCollection('cp').doc(username.toLowerCase()).get();
  } catch {
    return res
      .status(404)
      .json({ statusCode: 404, message: 'error loading constructor' });
  }
  if (!dbres.exists) {
    return res
      .status(404)
      .json({ statusCode: 404, message: 'constructor does not exist' });
  }

  const cp = validate(dbres.data(), username.toLowerCase());
  if (!cp) {
    return res
      .status(404)
      .json({ statusCode: 404, message: 'invalid constructor' });
  }

  const [puzzles] = await paginatedPuzzles(0, 10, 'a', cp.u);

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
    },
  });

  puzzles.forEach((p) => {
    const link = `https://crosshare.org/crosswords/${p.id}/${slugify(p.title)}`;
    feed.addItem({
      title: p.title,
      id: link,
      link: link,
      date: new Date(p.isPrivateUntil || p.publishTime),
      description: p.blogPost
        ? toHtml(
            markdownToHast({
              text: p.blogPost + `\n\n[Solve on Crosshare](${link})`,
            })
          )
        : `<a href='${link}'>Solve on Crosshare</a>`,
    });
  });

  res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=3600');
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/xml; charset=utf-8');
  res.end(feed.rss2());
}
