/* eslint-disable @typescript-eslint/no-explicit-any */

import { Plugin } from 'unified';

import { Direction } from '../lib/types';
import { parse } from 'twemoji-parser';
import ReactMarkdown from 'react-markdown';
import { Node, Parent } from 'unist';
import { Text, Element } from 'hast';
import { is } from 'unist-util-is';
import { ClueReference } from './ClueReference';

function flatMap(ast: Node | Parent, fn: (x: Node) => Node[]) {
  return transform(ast)[0];

  function transform(node: Node | Parent) {
    if (is<Parent>(node, (node: Node): node is Parent => 'children' in node)) {
      const out: Node[] = [];
      for (const child of node.children) {
        const xs = transform(child);
        if (xs) {
          out.push(...xs);
        }
      }
      node.children = out;
    }

    return fn(node);
  }
}

const twemojify: Plugin = () => {
  return (tree) => {
    flatMap(tree, (node: Node) => {
      if (!is<Text>(node, 'text')) {
        return [node];
      }
      const value = node.value;
      const emoji = parse(value, { assetType: 'png' });
      if (emoji.length === 0) {
        return [node];
      }
      const out = [];
      let startIndex = 0;
      while (emoji.length) {
        const current = emoji.shift();
        if (!current) break;
        out.push({
          type: 'text',
          value: value.substring(startIndex, current.indices[0]),
        });
        out.push({
          type: 'element',
          tagName: 'img',
          properties: {
            draggable: 'false',
            alt: current.text,
            src: current.url,
            className: 'twemoji',
          },
          children: [],
        });
        startIndex = current.indices[1];
      }
      out.push({ type: 'text', value: value.substring(startIndex) });
      return out;
    });
  };
};

interface ReferenceData {
    direction: Direction;
    labelNumber: number;
    start: number;
    end: number;
  }
  
const clueReferencer: Plugin = () => {
  return (tree) => {
    flatMap(tree, (node: Node): Node[] => {
      if (!is<Text>(node, 'text')) {
        return [node];
      }
      const value = node.value;
      const refs: Array<ReferenceData> = [];
      let match;
      const re =
        /\b(?<numSection>(,? ?(and)? ?\b\d+-? ?)+)(?<dir>a(cross(es)?)?|d(owns?)?)\b/gi;
      while ((match = re.exec(value)) !== null) {
        const dirString = match.groups?.dir?.toLowerCase();
        if (!dirString) {
          throw new Error('missing dir string');
        }
        const direction = dirString.startsWith('a') ? Direction.Across : Direction.Down;
        const numSection = match.groups?.numSection;
        if (!numSection) {
          throw new Error('missing numSection');
        }
        let numMatch: RegExpExecArray | null;
        const numRe = /\d+/g;
        while ((numMatch = numRe.exec(numSection)) !== null && numMatch[0]) {
          const labelNumber = parseInt(numMatch[0]);
          refs.push({
            direction,
            labelNumber,
            start: match.index + numMatch.index,
            end: match.index + numMatch.index + numMatch[0].length,
          });
        }
        const last = refs[refs.length - 1];
        if (last && match[0]) {
          last['end'] = match.index + match[0].length;
        }
      }
      if (!refs.length) {
        return [node];
      }

      let offset = 0;
      const out: Node[] = [];
      for (const ref of refs) {
        if (offset < ref.start) {
          out.push({
            type: 'text',
            value: value.slice(offset, ref.start),
          } as Text);
        }
        const text = value.slice(ref.start, ref.end);
        out.push({
          type: 'element',
          tagName: 'span',
          data: {...ref, text },
          properties: {
            className: 'clueref',
          },
          children: [{type: 'text', value: text}],
        } as Element);
        offset = ref.end;
      }
      if (offset < value.length) {
        out.push({
          type: 'text',
          value: value.slice(offset),
        } as Text);
      }
      return out;
    });
  };
};

export const Markdown = (props: {
  text: string;
  // If this is included, references to clues by answer or full clue number will
  // get a tooltip describing the referenced clues. This popup includes the
  // answer, so only include this in a context where spoilers are OK!
  clueMap?: Map<string, [number, Direction, string]>;
  preview?: number;
  inline?: boolean;
  className?: string;
  noRefs?: boolean;
}) => {
  const text = props.text.replace(/[^\s\S]/g, '');
  return (
    <div className={props.className}>
      <ReactMarkdown
        rehypePlugins={[twemojify, clueReferencer]}
        components={{
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          p({ node, children, ...props }) {
            return (
              <div className="paragraph" {...props}>
                {children}
              </div>
            );
          },
          span({node, children, className, ...props}) {
            const ref = node.data;
            if (className === 'clueref' && ref) {
              return <ClueReference
                          key={ref.start as string}
                          text={ref.text as string}
                          direction={parseInt(ref.direction as string)}
                          labelNumber={parseInt(ref.labelNumber as string)}
                        />;
              
            } else {
              return <span className={className} {...props}>
              {children}
            </span>;
            }
          }
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
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
