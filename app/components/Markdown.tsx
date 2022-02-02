/* eslint-disable @typescript-eslint/no-explicit-any */

import { css } from '@emotion/react';
import { ReactNode, Fragment, useState, useCallback } from 'react';
import SimpleMarkdown, {
  SingleASTNode,
  ASTNode,
  anyScopeRegex,
} from 'simple-markdown';
import { Direction, removeClueSpecials } from '../lib/types';
import { Link } from './Link';
import { ToolTipText } from './ToolTipText';
import { parse } from 'twemoji-parser';
import { ClueReference } from './ClueReference';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { image, refimage, ...baseRules } = { ...SimpleMarkdown.defaultRules };

interface ReferenceData {
  direction: Direction;
  labelNumber: number;
  start: number;
  end: number;
}

const rules: SimpleMarkdown.Rules<
  SimpleMarkdown.ReactOutputRule & SimpleMarkdown.HtmlOutputRule
> = {
  ...baseRules,
  blockQuote: {
    ...SimpleMarkdown.defaultRules.blockQuote,
    match: SimpleMarkdown.blockRegex(/^( *>[^!\n]+(\n[^\n]+)*\n*)+\n{2,}/),
  },
  u: {
    ...SimpleMarkdown.defaultRules.u,
    match: SimpleMarkdown.inlineRegex(/^__([^_](?:\\[\s\S]|[^\\])*?)__(?!_)/),
  },
  link: {
    ...SimpleMarkdown.defaultRules.link,
    react(node: any, output: any, state: any) {
      return SimpleMarkdown.reactElement('a', state.key, {
        href: SimpleMarkdown.sanitizeUrl(node.target),
        target: '_blank',
        rel: 'nofollow ugc noopener noreferrer',
        title: node.title,
        children: output(node.content, state),
      });
    },
  },
  atMention: {
    order: SimpleMarkdown.defaultRules.em.order - 0.5,
    match(source: any) {
      return /^@([a-zA-Z]\w+)/.exec(source);
    },
    parse(capture: any) {
      return {
        content: capture[1],
      };
    },
    react(node: any, _recurseOutput: any, state: any) {
      return (
        <Link key={state.key} href={`/${node.content}`}>
          @{node.content}
        </Link>
      );
    },
    html(node: any) {
      return `<a href="https://crosshare.org/${node.content}">@${node.content}</b>`;
    },
  },
  tagMention: {
    order: SimpleMarkdown.defaultRules.em.order - 0.5,
    match(source: any) {
      return /^#([a-zA-Z0-9][a-zA-Z0-9-]+)/.exec(source);
    },
    parse(capture: any) {
      return {
        content: capture[1],
      };
    },
    react(node: any, _recurseOutput: any, state: any) {
      return (
        <Link key={state.key} href={`/tags/${node.content}`}>
          #{node.content}
        </Link>
      );
    },
    html(node: any) {
      return `<a href="https://crosshare.org/tags/${node.content}">#${node.content}</b>`;
    },
  },
  spoiler: {
    order: SimpleMarkdown.defaultRules.em.order - 0.5,
    match(source: any, state: any) {
      if (state.inSpoiler) {
        return null;
      }
      return /^>!(.+?)!</.exec(source) || /^\|\|(.+?)\|\|/.exec(source);
    },
    parse(capture: any, recurseParse: any, state: any) {
      return {
        content: recurseParse(capture[1], { ...state, inSpoiler: true }),
      };
    },
    react(node: any, recurseOutput: any, state: any) {
      return (
        <SpoilerText key={state.key}>
          {recurseOutput(node.content, state)}
        </SpoilerText>
      );
    },
    html() {
      return '<b>Spoiler omitted</b>';
    },
  },
  clueRefs: {
    order: SimpleMarkdown.defaultRules.text.order - 0.5,
    match(source: any, state: any) {
      console.log('here', state.noRefs);
      if (state.noRefs) {
        return null;
      }
      return /^(?<numSection>(,? ?(and)? ?\b\d+-? ?)+)(?<dir>a(cross(es)?)?|d(owns?)?)\b/i.exec(
        source
      );
    },
    parse(capture: any) {
      const refs: Array<ReferenceData> = [];
      const dirString = capture.groups?.dir?.toLowerCase();
      if (!dirString) {
        throw new Error('missing dir string');
      }
      const dir = dirString.startsWith('a') ? Direction.Across : Direction.Down;
      const numSection = capture.groups?.numSection;
      if (!numSection) {
        throw new Error('missing numSection');
      }
      let numMatch: RegExpExecArray | null;
      const numRe = /\d+/g;
      while ((numMatch = numRe.exec(numSection)) !== null && numMatch[0]) {
        const labelNumber = parseInt(numMatch[0]);
        refs.push({
          direction: dir,
          labelNumber,
          start: numMatch.index,
          end: numMatch.index + numMatch[0].length,
        });
      }
      const last = refs[refs.length - 1];
      if (last && capture[0]) {
        last['end'] = capture[0].length;
      }

      return {
        content: capture[0],
        refs,
      };
    },
    react(node: any, _recurseOutput: any, _state: any) {
      const text = node.content as string;
      const refs = node.refs as Array<ReferenceData>;
      let offset = 0;
      const parts: Array<ReactNode> = [];
      let i = 0;
      for (const ref of refs) {
        if (offset < ref.start) {
          parts.push(text.slice(offset, ref.start));
        }
        parts.push(
          <ClueReference
            key={i++}
            text={text.slice(ref.start, ref.end)}
            {...ref}
          />
        );
        offset = ref.end;
      }
      if (offset < text.length) {
        parts.push(text.slice(offset));
      }
      return parts;
    },
    html(node: any) {
      return node.content;
    },
  },
  text: {
    ...SimpleMarkdown.defaultRules.text,
    // Here we look for anything followed by non-symbols,
    // double newlines, or double-space-newlines
    // We break on any symbol characters so that this grammar
    // is easy to extend without needing to modify this regex
    match: anyScopeRegex(
      /^[\s\S]+?(?=[^A-Za-z\s\u00c0-\uffff]|\n\n| {2,}\n|\w+:\S|$)/
    ),
    react(node: any, _output: any, _state: any) {
      const content: string = node.content;
      const emoji = parse(content, { assetType: 'png' });
      const out: Array<ReactNode> = [];
      let startIndex = 0;
      while (emoji.length) {
        const current = emoji.shift();
        if (!current) break;
        out.push(content.substring(startIndex, current.indices[0]));
        out.push(
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={current.indices[0]}
            draggable={false}
            css={{
              width: '1em',
              height: '1em',
              margin: '0 .05em 0 .1em',
              verticalAlign: '-0.1em',
            }}
            src={current.url}
            alt={current.text}
          />
        );
        startIndex = current.indices[1];
      }
      out.push(content.substring(startIndex));
      return out;
    },
  },
};

export const parser = SimpleMarkdown.parserFor(rules);
const output = SimpleMarkdown.outputFor(rules, 'react');
export const htmlOutput = SimpleMarkdown.outputFor(rules, 'html');

const SpoilerText = ({ children }: { children: ReactNode }) => {
  const [revealed, setRevealed] = useState(false);

  const doReveal = useCallback(
    (e) => {
      if (!revealed) {
        e.stopPropagation();
        setRevealed(true);
      }
    },
    [revealed]
  );

  return (
    <span
      onClick={doReveal}
      onKeyPress={doReveal}
      role="button"
      tabIndex={0}
      css={{
        ...(!revealed && {
          backgroundColor: 'var(--text)',
          cursor: 'pointer',
          userSelect: 'none',
          '& *': {
            visibility: 'hidden',
          },
        }),
      }}
    >
      {children}
    </span>
  );
};

function chopSingle(ast: SingleASTNode, max: number): [SingleASTNode, number] {
  if (!ast.content) {
    return [ast, max];
  }
  if (Array.isArray(ast.content)) {
    const [newContent, remaining] = chop(ast.content, max);
    return [{ ...ast, content: newContent }, remaining];
  }
  if (typeof ast.content === 'string') {
    let newContent = ast.content.slice(0, max);
    const newContentLength = newContent.length;
    if (newContentLength !== ast.content.length) {
      newContent += '...';
    }
    return [{ ...ast, content: newContent }, max - newContentLength];
  }
  return [ast, max];
}

function chop(
  ast: Array<SingleASTNode>,
  max: number
): [Array<SingleASTNode>, number] {
  const out: Array<SingleASTNode> = [];
  let remaining = max;
  let res: ASTNode;
  for (const node of ast) {
    [res, remaining] = chopSingle(node, remaining);
    out.push(res);
    if (remaining <= 0) {
      break;
    }
  }
  return [out, remaining];
}

function chopTo(
  ast: Array<SingleASTNode>,
  chars?: number
): Array<SingleASTNode> {
  if (!chars) {
    return ast;
  }
  const [out] = chop(ast, chars);
  return out;
}

const marginRight = css`
  margin-right: 0.5em;
`;

export const Markdown = ({
  text,
  clueMap,
  inline,
  preview,
  className,
  noRefs,
}: {
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
  text = text.replace(/[^\s\S]/g, '');
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
