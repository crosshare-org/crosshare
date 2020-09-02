/* eslint-disable @typescript-eslint/no-explicit-any */

import { ReactNode, useState, Fragment } from 'react';
import SimpleMarkdown from 'simple-markdown';
import { usePopper } from 'react-popper';
import { useHover } from '../lib/hooks';
import { Direction } from '../lib/types';

const rules: SimpleMarkdown.Rules<SimpleMarkdown.ReactOutputRule> = {
  ...SimpleMarkdown.defaultRules,
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

const ClueMouseover = (props: { entry: string, mouseover: [number, Direction, string] }) => {
  const [referenceElement, setReferenceElement] = useState<HTMLSpanElement | null>(null);
  const [popperElement, setPopperElement] = useState<HTMLDivElement | null>(null);
  const [arrowElement, setArrowElement] = useState<HTMLDivElement | null>(null);
  const [isHovered, hoverBind] = useHover();
  const { styles, attributes } = usePopper(referenceElement, popperElement, {
    modifiers: [
      { name: 'arrow', options: { element: arrowElement } },
      { name: 'offset', options: { offset: [0, 10] } }
    ],
  });

  return <>
    <span css={{
      borderBottom: '1px dotted',
    }} ref={setReferenceElement} {...hoverBind}>
      {props.entry}
    </span>
    <div css={{
      borderRadius: '5px',
      backgroundColor: 'var(--black)',
      color: 'var(--white)',
      textAlign: 'center',
      padding: '10px',
      visibility: isHovered ? 'visible' : 'hidden'
    }} ref={setPopperElement} style={styles.popper} {...attributes.popper}>
      <b css={{ marginRight: '0.5em' }}>{props.mouseover[0]}{props.mouseover[1] === Direction.Down ? 'D' : 'A'}</b>
      {props.mouseover[2]}
      <div css={{
        position: 'absolute',
        width: '10px',
        height: '10px',
        '[data-popper-placement^="bottom"] &': {
          top: '-5px',
        },
        '[data-popper-placement^="top"] &': {
          bottom: '-5px',
        },
        '&::after': {
          content: '" "',
          position: 'absolute',
          transform: 'rotate(45deg)',
          width: '10px',
          height: '10px',
          backgroundColor: 'var(--black)',
        }
      }} ref={setArrowElement} style={styles.arrow} />
    </div>
  </>;
};

export const Markdown = ({ text, clueMap }: { text: string, clueMap?: Map<string, [number, Direction, string]> }) => {
  if (clueMap && clueMap.size) {
    const regex = '^([^0-9A-Za-z\\s\\u00c0-\\uffff]*[0-9A-Za-z\\s\\u00c0-\\uffff]*)\\b(' + Array.from(clueMap.keys()).join('|') + ')\\b';
    const re = new RegExp(regex);
    const newRules = {
      ...rules,
      cluedWord: {
        order: SimpleMarkdown.defaultRules.em.order - 0.6,
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
            <ClueMouseover entry={node.content} mouseover={mouseover} />
          </Fragment>;
        },
      }
    };
    return SimpleMarkdown.outputFor(newRules, 'react')(SimpleMarkdown.parserFor(newRules)(text + '\n\n'));
  }
  return output(parser(text + '\n\n'));
};
