/* eslint-disable @typescript-eslint/no-explicit-any */

import { ReactNode, Fragment } from 'react';
import SimpleMarkdown from 'simple-markdown';
import { useHover } from '../lib/hooks';
import { Direction } from '../lib/types';
import { ToolTipText } from './ToolTipText';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { image, refimage, ...baseRules } = { ...SimpleMarkdown.defaultRules };

const rules: SimpleMarkdown.Rules<SimpleMarkdown.ReactOutputRule> = {
  ...baseRules,
  blockQuote: {
    ...SimpleMarkdown.defaultRules.blockQuote,
    match: SimpleMarkdown.blockRegex(/^( *>[^!\n]+(\n[^\n]+)*\n*)+\n{2,}/),
  },
  link: {
    ...SimpleMarkdown.defaultRules.link,
    react(node: any, output: any, state: any) {
      return SimpleMarkdown.reactElement(
        'a',
        state.key,
        {
          href: SimpleMarkdown.sanitizeUrl(node.target),
          target: '_blank',
          rel: 'nofollow ugc noopener noreferrer',
          title: node.title,
          children: output(node.content, state)
        }
      );
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
        content: recurseParse(capture[1], { ...state, inSpoiler: true })
      };
    },
    react(node: any, recurseOutput: any, state: any) {
      return <SpoilerText key={state.key}>{recurseOutput(node.content, state)}</SpoilerText>;
    },
  }
};

const parser = SimpleMarkdown.parserFor(rules);
const output = SimpleMarkdown.outputFor(rules, 'react');

const SpoilerText = ({ children }: { children: ReactNode }) => {
  const [isHovered, hoverBind] = useHover();

  return <span css={{
    backgroundColor: isHovered ? 'var(--bg)' : 'var(--text)',
  }} {...hoverBind}>{children}</span>;
};

export const Markdown = ({ text, clueMap, inline }: { text: string, clueMap?: Map<string, [number, Direction, string]>, inline?: boolean }) => {
  if (clueMap && clueMap.size) {
    const regex = '^([^0-9A-Za-z\\s\\u00c0-\\uffff]*[0-9A-Za-z\\s\\u00c0-\\uffff]*)\\b(' + Array.from(clueMap.keys()).join('|') + ')\\b';
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
            content: capture[2]
          };
        },
        react(node: any, recurseOutput: any, state: any) {
          const mouseover = clueMap.get(node.content);
          if (!mouseover) {
            throw new Error('expected to find clue ' + node.content);
          }
          return <Fragment key={state.key}>
            {recurseOutput(node.pre, state)}
            <ToolTipText text={node.content} tooltip={
              <>
                <b css={{ marginRight: '0.5em' }}>{mouseover[0]}{mouseover[1] === Direction.Down ? 'D' : 'A'}</b>
                {mouseover[2]}
              </>
            } />
          </Fragment>;
        },
      }
    };
    return SimpleMarkdown.outputFor(newRules, 'react')(SimpleMarkdown.parserFor(newRules)(text + '\n\n', { inline }));
  }
  return output(parser(text + '\n\n', { inline }));
};
