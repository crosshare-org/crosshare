import { Feed } from 'feed';
import { toHtml } from 'hast-util-to-html';
import { NextApiRequest, NextApiResponse } from 'next';
import { validate } from '../../../lib/constructorPage.js';
import { getCollection } from '../../../lib/firebaseAdminWrapper.js';
import { markdownToHast } from '../../../lib/markdown/markdown.js';
import { paginatedPuzzles } from '../../../lib/paginatedPuzzles.js';
import { getStorageUrl } from '../../../lib/serverOnly.js';
import { slugify } from '../../../lib/utils.js';

export default async function constructorFeed(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { username, format } = req.query;
  if (Array.isArray(username) || !username) {
    res.status(404).json({ statusCode: 404, message: 'bad params' });
    return;
  }
  let dbres;
  try {
    dbres = await getCollection('cp').doc(username.toLowerCase()).get();
  } catch {
    res
      .status(404)
      .json({ statusCode: 404, message: 'error loading constructor' });
    return;
  }
  if (!dbres.exists) {
    res
      .status(404)
      .json({ statusCode: 404, message: 'constructor does not exist' });
    return;
  }

  const cp = validate(dbres.data(), username.toLowerCase());
  if (!cp) {
    res.status(404).json({ statusCode: 404, message: 'invalid constructor' });
    return;
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

  const avatar = await getStorageUrl(`users/${cp.u}/profile.jpg`);

  feed.addExtension({
    name: 'byline:contributors',
    objects: {
      'byline:person': {
        _attributes: {
          id: cp.u,
        },
        'byline:name': {
          _text: cp.n,
        },
        'byline:context': {
          _text: cp.b,
        },
        'byline:url': {
          _text: `https://crosshare.org/${cp.i}`,
        },
        ...(avatar && {
          'byline:avatar': {
            _text: avatar,
          },
        }),
      },
    },
  });

  puzzles.forEach((p) => {
    const link = `https://crosshare.org/crosswords/${p.id}/${slugify(p.title)}`;
    const bylineAuthor = p.guestConstructor
      ? [
          {
            name: 'byline:author',
            objects: {
              'byline:person': {
                _attributes: {
                  id: `guest-${p.id}`,
                },
                'byline:name': {
                  _text: p.guestConstructor,
                },
              },
            },
          },
          {
            name: 'byline:role',
            objects: {
              _text: 'guest',
            },
          },
        ]
      : [
          {
            name: 'byline:author',
            objects: {
              _attributes: {
                ref: p.authorId,
              },
            },
          },
        ];
    feed.addItem({
      title: p.title,
      id: link,
      link: link,
      date: new Date(p.isPrivateUntil ?? p.publishTime),
      extensions: bylineAuthor,
      enclosure: {
        url: format == 'puz' ? `https://crosshare.org/api/puz/${p.id}` : `https://crosshare.org/api/ipuz/${p.id}`,
        type: format == 'puz' ? 'application/x-crossword' : 'application/ipuz+json',
      },
      description: p.blogPost
        ? toHtml(
            markdownToHast({
              text: p.blogPost + `\n\n[Solve on Crosshare](${link})`,
            })
          )
        : `<a href='${link}'>Solve on Crosshare</a>`,
    });
  });

  const xml = feed
    .rss2()
    .replace('<rss ', `<rss xmlns:byline="https://bylinespec.org/1.0" `);

  res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=3600');
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/xml; charset=utf-8');
  res.end(xml);
}
