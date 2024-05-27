import cases from 'jest-in-case';
import { micromark } from 'micromark';
import {
  spoilersHtml,
  spoilersSyntax,
} from '../lib/markdown/micromark-extension-spoilers.js';

cases(
  'test spoilers syntax',
  (opts) => {
    const serialized = micromark(opts.markdown, {
      extensions: [spoilersSyntax()],
      htmlExtensions: [spoilersHtml],
    });

    expect(serialized).toEqual(opts.html);
  },
  [
    {
      markdown: 'Testing ||a basic spoiler|| in a paragraph',
      html: '<p>Testing <span class="spoiler">a basic spoiler</span> in a paragraph</p>',
    },
    {
      markdown: 'Testing|| a non spoiler ||in a paragraph',
      html: '<p>Testing|| a non spoiler ||in a paragraph</p>',
    },
    {
      markdown: 'Testing || a spoiler || in a paragraph',
      html: '<p>Testing <span class="spoiler"> a spoiler </span> in a paragraph</p>',
    },
    {
      markdown: 'Testing ||a spoiler||. in a paragraph',
      html: '<p>Testing <span class="spoiler">a spoiler</span>. in a paragraph</p>',
    },
    {
      markdown: '||a spoiler||',
      html: '<p><span class="spoiler">a spoiler</span></p>',
    },
    {
      markdown: '||a spoiler with\n\na paragraph break||',
      html: '<p>||a spoiler with</p>\n<p>a paragraph break||</p>',
    },
    {
      markdown: '||a **spoiler|| and a** bold',
      html: '<p><span class="spoiler">a **spoiler</span> and a** bold</p>',
    },
    {
      markdown: '||a **spoiler and a**|| bold',
      html: '<p><span class="spoiler">a <strong>spoiler and a</strong></span> bold</p>',
    },
    {
      markdown: '>!a spoiler!<',
      html: '<p><span class="spoiler">a spoiler</span></p>',
    },
    {
      markdown: 'this is >!a spoiler!< now',
      html: '<p>this is <span class="spoiler">a spoiler</span> now</p>',
    },
    {
      markdown: 'can punctuate ->!a spoiler!<.',
      html: '<p>can punctuate -<span class="spoiler">a spoiler</span>.</p>',
    },
    {
      markdown: '!<not a spoiler!<',
      html: '<p>!&lt;not a spoiler!&lt;</p>',
    },
    {
      markdown: '>!not a spoiler>!',
      html: '<p>&gt;!not a spoiler&gt;!</p>',
    },
    {
      markdown: '!<not a spoiler>!',
      html: '<p>!&lt;not a spoiler&gt;!</p>',
    },
    {
      markdown: 'no space>! not a spoiler!<',
      html: '<p>no space&gt;! not a spoiler!&lt;</p>',
    },
  ]
);
