import { Root } from 'hast';
import { Options as TruncateOptions, truncate } from 'hast-util-truncate';
import { Nodes } from 'mdast';
import { Handler } from 'mdast-util-to-hast';
import rehypeExternalLinks from 'rehype-external-links';
import remarkDirective from 'remark-directive';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import remarkStringify from 'remark-stringify';
import { PluggableList, unified } from 'unified';
import { Direction } from '../types.js';
import { clueReferencer } from './clueReferencer.js';
import { entryReferencer } from './entryReferencer.js';
import { inlineOnly } from './inlineOnly.js';
import { mentionsAndTags } from './mentionsAndTags.js';
import { remarkNoRefs } from './noRefs.js';
import { remarkSpoilers } from './spoilers.js';
import { twemojify } from './twemojify.js';
import unusedDirectives from './unusedDirectives.js';

function rehypeTruncate(options: TruncateOptions) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
  return (tree: any) => truncate(tree, options);
}

export function removeSpoilers(text: string): string {
  const processor = unified().use([
    remarkParse,
    remarkSpoilers,
    [
      remarkStringify,
      {
        handlers: {
          spoiler: () => {
            return '[spoiler]';
          },
        },
      },
    ],
  ]);
  return String(processor.processSync(text));
}

export function markdownToHast(props: {
  text: string;
  // If this is included, references to clues by entry will get tooltips
  clueMap?: Map<string, [number, Direction, string]>;
  preview?: number;
  inline?: boolean;
  leaveEmoji?: boolean;
}): Root {
  let allowRefs = true;
  if (props.text.startsWith('!@')) {
    allowRefs = false;
  }
  const text = props.text.replace(/[^\s\S]/g, '').replace(/^![@#]/, '');
  const rehypePlugins: PluggableList = [
    [
      rehypeExternalLinks,
      {
        target: '_blank',
        rel: ['nofollow', 'ugc', 'noopener', 'noreferrer'],
        protocols: ['http', 'https', 'mailto'],
      },
    ],
  ];
  if (!props.leaveEmoji) {
    rehypePlugins.push(twemojify);
  }
  if (props.preview) {
    rehypePlugins.push([
      rehypeTruncate,
      { size: props.preview, ellipsis: '…' },
    ]);
  }
  if (allowRefs) {
    rehypePlugins.push(clueReferencer);
    if (props.clueMap) {
      rehypePlugins.push([entryReferencer, { clueMap: props.clueMap }]);
    }
  }

  const handlers: Record<string, Handler> = {
    spoiler: (state, node: Nodes) => {
      const props = { className: 'spoiler' };
      return {
        type: 'element',
        tagName: 'span',
        properties: props,
        children: state.all(node),
      };
    },
  };

  const processor = unified().use([
    remarkParse,
    remarkGfm,
    remarkDirective,
    remarkSpoilers,
    remarkGfm,
    mentionsAndTags,
    remarkNoRefs,
    unusedDirectives,
    [
      remarkRehype,
      {
        handlers: handlers,
      },
    ],
    ...rehypePlugins,
  ]);

  if (props.inline) {
    processor.use(inlineOnly);
  }

  // TODO not sure how to best avoid this type cast
  return processor.runSync(processor.parse(text)) as Root;
}
