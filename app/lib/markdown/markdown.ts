import { clueReferencer } from './clueReferencer';
import { twemojify } from './twemojify';
import { remarkSpoilers } from './spoilers';
import { all } from 'mdast-util-to-hast';
import rehypeExternalLinks from 'rehype-external-links';
import { truncate, Options as TruncateOptions } from 'hast-util-truncate';
import { entryReferencer } from './entryReferencer';
import remarkGfm from 'remark-gfm';
import remarkDirective from 'remark-directive';
import { mentionsAndTags } from './mentionsAndTags';
import { unified, PluggableList } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { Direction } from '../types';
import { Root } from 'hast';
import { inlineOnly } from './inlineOnly';
import { remarkNoRefs } from './noRefs';

function rehypeTruncate(options: TruncateOptions) {
  // @ts-expect-error: assume input `root` matches output root.
  return (tree) => truncate(tree, options);
}

export function markdownToHast(props: {
  text: string;
  // If this is included, references to clues by entry will get tooltips
  clueMap?: Map<string, [number, Direction, string]>;
  preview?: number;
  inline?: boolean;
}): Root {
  const text = props.text.replace(/[^\s\S]/g, '').replace(/^![@#]/, '');
  const rehypePlugins: PluggableList = [
    twemojify,
    clueReferencer,
    [
      rehypeExternalLinks,
      {
        target: '_blank',
        rel: ['nofollow', 'ugc', 'noopener', 'noreferrer'],
        protocols: ['http', 'https', 'mailto'],
      },
    ],
  ];
  if (props.preview) {
    rehypePlugins.push([
      rehypeTruncate,
      { size: props.preview, ellipsis: '…' },
    ]);
  }
  if (props.clueMap) {
    rehypePlugins.push([entryReferencer, { clueMap: props.clueMap }]);
  }

  const processor = unified()
    .use(remarkParse)
    .use(remarkDirective)
    .use(remarkSpoilers)
    .use(remarkGfm)
    .use(mentionsAndTags)
    .use(remarkNoRefs)
    .use(remarkRehype, {
      handlers: {
        spoiler(h, node) {
          const props = { className: 'spoiler' };
          return h(node, 'span', props, all(h, node));
        },
      },
    })
    .use(rehypePlugins);

  if (props.inline) {
    processor.use(inlineOnly);
  }

  return processor.runSync(processor.parse(text)) as Root;
}
