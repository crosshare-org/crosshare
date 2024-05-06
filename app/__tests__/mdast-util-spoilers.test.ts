import cases from 'jest-in-case';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { removePosition } from 'unist-util-remove-position';
import { fromMarkdownExtension } from '../lib/markdown/mdast-util-spoilers';
import { spoilersSyntax } from '../lib/markdown/micromark-extension-spoilers';

cases(
  'test spoilers syntax',
  (opts) => {
    const tree = fromMarkdown(opts.markdown, 'utf-8', {
      extensions: [spoilersSyntax()],
      mdastExtensions: [fromMarkdownExtension],
    });

    removePosition(tree, { force: false });

    expect(tree).toEqual(opts.mdast);
  },
  [
    {
      markdown: 'Testing ||a basic spoiler|| in a paragraph',
      mdast: {
        children: [
          {
            children: [
              {
                type: 'text',
                value: 'Testing ',
              },
              {
                children: [
                  {
                    type: 'text',
                    value: 'a basic spoiler',
                  },
                ],
                type: 'spoiler',
              },
              {
                type: 'text',
                value: ' in a paragraph',
              },
            ],
            type: 'paragraph',
          },
        ],
        type: 'root',
      },
    },
  ]
);
