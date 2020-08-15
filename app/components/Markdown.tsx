/* eslint-disable @typescript-eslint/no-explicit-any */

import { ReactNode } from 'react';
import SimpleMarkdown from 'simple-markdown';

const rules: SimpleMarkdown.Rules<SimpleMarkdown.ReactOutputRule> = {
  ...SimpleMarkdown.defaultRules,
  blockQuote: {
    ...SimpleMarkdown.defaultRules.blockQuote,
    match: SimpleMarkdown.blockRegex(/^( *>[^!\n]+(\n[^\n]+)*\n*)+\n{2,}/),
  },
  paragraph: {
    ...SimpleMarkdown.defaultRules.paragraph,
    react: (node: any, recurseOutput: any, state: any) => {
      return <p key={state.key}>{recurseOutput(node.content, state)}</p>;
    }
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
          rel: 'nofollow ugc',
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
  return <span css={{
    backgroundColor: 'var(--text)',
    '&:hover': {
      backgroundColor: 'var(--bg)',
    }
  }}>{children}</span>;
};

export const Markdown = ({ text }: { text: string }) => {
  return output(parser(text + '\n\n'));
};
