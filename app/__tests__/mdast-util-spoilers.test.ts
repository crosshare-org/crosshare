import cases from 'jest-in-case';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { fromMarkdownExtension } from '../lib/markdown/mdast-util-spoilers';
import { spoilersSyntax } from '../lib/markdown/micromark-extension-spoilers';
import { removePosition } from 'unist-util-remove-position';

cases(
  'test spoilers syntax',
  (opts) => {
    const tree = removePosition(
      fromMarkdown(opts.markdown, 'utf-8', {
        extensions: [spoilersSyntax()],
        mdastExtensions: [fromMarkdownExtension],
      }),
      true
    );

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
