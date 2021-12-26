/* eslint-disable @typescript-eslint/no-explicit-any */

import { css } from '@emotion/react';
import { ReactNode, Fragment, useState, useCallback } from 'react';
import SimpleMarkdown, { SingleASTNode, ASTNode } from 'simple-markdown';
import { Direction, removeClueSpecials } from '../lib/types';
import { ToolTipText } from './ToolTipText';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { image, refimage, ...baseRules } = { ...SimpleMarkdown.defaultRules };

const rules: SimpleMarkdown.Rules<
  SimpleMarkdown.ReactOutputRule & SimpleMarkdown.HtmlOutputRule
> = {
  ...baseRules,
  blockQuote: {
    ...SimpleMarkdown.defaultRules.blockQuote,
    match: SimpleMarkdown.blockRegex(/^( *>[^!\n]+(\n[^\n]+)*\n*)+\n{2,}/),
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
}: {
  text: string;
  // If this is included, references to clues by answer or full clue number will
  // get a tooltip describing the referenced clues. This popup includes the
  // answer, so only include this in a context where spoilers are OK!
  clueMap?: Map<string, [number, Direction, string]>;
  preview?: number;
  inline?: boolean;
  className?: string;
}) => {
  text = text.replace(/[^\s\S]/g, '');
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
            SimpleMarkdown.parserFor(newRules)(text + '\n\n', { inline }),
            preview
          )
        )}
      </div>
    );
  }
  return (
    <div className={className}>
      {output(chopTo(parser(text + '\n\n', { inline }), preview))}
    </div>
  );
};
