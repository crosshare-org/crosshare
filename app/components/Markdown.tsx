import { Direction } from '../lib/types';
import { ClueReference } from './ClueReference';
import { SpoilerText } from './SpoilerText';
import { ShowRefsContext } from './ShowRefsContext';
import { markdownToHast } from '../lib/markdown/markdown';
import rehypeReact from 'rehype-react';
import { unified } from 'unified';
import { createElement, Fragment } from 'react';

export const Markdown = (props: {
  text: string;
  // If this is included, references to clues by entry will get tooltips
  clueMap?: Map<string, [number, Direction, string]>;
  preview?: number;
  inline?: boolean;
  className?: string;
  noRefs?: boolean;
}) => {
  const hast = markdownToHast(props);
  const reactContent = unified()
    .use(rehypeReact, {
      createElement,
      Fragment,
      passNode: true,
      components: {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        p: ({ node, children, ...props }) => {
          return (
            <div className="paragraph" {...props}>
              {children}
            </div>
          );
        },
        span: ({ node, children, className, ...props }) => {
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
      },
    })
    .stringify(hast);
  const rendered = (
    <ShowRefsContext.Provider value={!props.noRefs}>
      {reactContent}
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
