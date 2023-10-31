import { clueReferencer } from './clueReferencer';
import { twemojify } from './twemojify';
import { remarkSpoilers } from './spoilers';
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
import { Handler } from 'mdast-util-to-hast';
import { Nodes } from 'mdast-util-from-markdown/lib';
import unusedDirectives from './unusedDirectives';

function rehypeTruncate(options: TruncateOptions) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
  return (tree: any) => truncate(tree, options);
}

export function markdownToHast(props: {
  text: string;
  // If this is included, references to clues by entry will get tooltips
  clueMap?: Map<string, [number, Direction, string]>;
  preview?: number;
  inline?: boolean;
}): Root {
  let allowRefs = true;
  if (props.text.startsWith('!@')) {
    allowRefs = false;
  }
  const text = props.text.replace(/[^\s\S]/g, '').replace(/^![@#]/, '');
  const rehypePlugins: PluggableList = [
    twemojify,
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

  const processor = unified()
    .use(remarkParse)
    .use(remarkDirective)
    .use(remarkSpoilers)
    .use(remarkGfm)
    .use(mentionsAndTags)
    .use(remarkNoRefs)
    .use(unusedDirectives)
    .use(remarkRehype, {
      handlers: handlers,
    })
    .use(rehypePlugins);

  if (props.inline) {
    processor.use(inlineOnly);
  }

  return processor.runSync(processor.parse(text));
}
