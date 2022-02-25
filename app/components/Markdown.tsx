/* eslint-disable @typescript-eslint/no-explicit-any */

import { Direction } from '../lib/types';
import ReactMarkdown from 'react-markdown';
import { ClueReference } from './ClueReference';
import { clueReferencer } from '../lib/markdown/clueReferencer';
import { twemojify } from '../lib/markdown/twemojify';
import { remarkSpoilers } from '../lib/markdown/spoilers';
import { all } from 'mdast-util-to-hast';
import { SpoilerText } from './SpoilerText';
import rehypeExternalLinks from 'rehype-external-links';
import { PluggableList } from 'react-markdown/lib/react-markdown';
import { truncate, Options as TruncateOptions } from 'hast-util-truncate';
import { ShowRefsContext } from './ShowRefsContext';
import { entryReferencer } from '../lib/markdown/entryReferencer';
import remarkGfm from 'remark-gfm';
import { mentionsAndTags } from '../lib/markdown/mentionsAndTags';

function rehypeTruncate(options: TruncateOptions) {
  // @ts-expect-error: assume input `root` matches output root.
  return (tree) => truncate(tree, options);
}

export const Markdown = (props: {
  text: string;
  // If this is included, references to clues by entry will get tooltips
  clueMap?: Map<string, [number, Direction, string]>;
  preview?: number;
  inline?: boolean;
  className?: string;
  noRefs?: boolean;
}) => {
  const text = props.text.replace(/[^\s\S]/g, '');
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

  const rendered = (
    <ShowRefsContext.Provider value={!props.noRefs}>
      <ReactMarkdown
        remarkPlugins={[remarkSpoilers, remarkGfm, mentionsAndTags]}
        remarkRehypeOptions={{
          handlers: {
            spoiler(h, node) {
              const props = { className: 'spoiler' };
              return h(node, 'span', props, all(h, node));
            },
          },
        }}
        rehypePlugins={rehypePlugins}
        components={{
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          p({ node, children, ...props }) {
            return (
              <div className="paragraph" {...props}>
                {children}
              </div>
            );
          },
          span({ node, children, className, ...props }) {
            const ref = node.data;
            if (className === 'clueref' && ref) {
              return (
                <ClueReference
                  key={ref.start as string}
                  text={ref.text as string}
                  direction={parseInt(ref.direction as string)}
                  labelNumber={parseInt(ref.labelNumber as string)}
                />
              );
            } else if (className === 'spoiler') {
              return <SpoilerText>{children}</SpoilerText>;
            } else {
              return (
                <span className={className} {...props}>
                  {children}
                </span>
              );
            }
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </ShowRefsContext.Provider>
  );

  if (props.className || !props.inline)
    return <div className={props.className}>{rendered}</div>;
  return rendered;
};
/**
  if (!inline) {
    text += '\n\n';
  }
  if (clueMap && clueMap.size) {
    const fullClueMap = new Map<
      string,
      { fullClueNumber: string; answer: string; clue: string }
    >();
    clueMap.forEach(([clueNumber, direction, clue], answer) => {
      const longDirection = direction === Direction.Down ? 'Down' : 'Across';
      const shortDirection = direction === Direction.Down ? 'D' : 'A';
      const fullClueNumber = `${clueNumber}${shortDirection}`;
      const entry = { fullClueNumber, answer, clue };
      fullClueMap.set(answer, entry);
      ['', '-'].forEach((separator) => {
        [shortDirection, longDirection].forEach((directionText) => {
          fullClueMap.set(`${clueNumber}${separator}${directionText}`, entry);
        });
      });
    });

    const regex =
      '^([^0-9A-Za-z\\s\\u00c0-\\uffff]*[0-9A-Za-z\\s\\u00c0-\\uffff]*)\\b(' +
      Array.from(fullClueMap.keys()).join('|') +
      ')\\b';
    const re = new RegExp(regex);
    const newRules = {
      ...rules,
      cluedWord: {
        order: SimpleMarkdown.defaultRules.em.order - 0.3,
        match(source: any) {
          return re.exec(source);
        },
        parse(capture: any, recurseParse: any, state: any) {
          return {
            pre: recurseParse(capture[1], state),
            content: capture[2],
          };
        },
        react(node: any, recurseOutput: any, state: any) {
          const mouseover = fullClueMap.get(node.content);
          if (!mouseover) {
            throw new Error('expected to find clue ' + node.content);
          }
          return (
            <Fragment key={state.key}>
              {recurseOutput(node.pre, state)}
              <ToolTipText
                text={node.content}
                tooltip={
                  <>
                    <b css={marginRight}>
                      {mouseover.fullClueNumber} <code>{mouseover.answer}</code>
                    </b>
                    {removeClueSpecials(mouseover.clue)}
                  </>
                }
              />
            </Fragment>
          );
        },
      },
    };
    return (
      <div className={className}>
        {SimpleMarkdown.outputFor(
          newRules,
          'react'
        )(
          chopTo(
            SimpleMarkdown.parserFor(newRules, { noRefs })(text, {
              inline,
            }),
            preview
          )
        )}
      </div>
    );
  }
  return (
    <div className={className}>
      {output(chopTo(parser(text, { inline, noRefs }), preview))}
    </div>
  );
};
 */
