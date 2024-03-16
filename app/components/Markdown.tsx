import { ClueReference } from './ClueReference';
import { SpoilerText } from './SpoilerText';
import { ShowRefsContext } from './ShowRefsContext';
import rehypeReact, { Components } from 'rehype-react';
import { unified } from 'unified';

import type { Root } from 'hast';
import { ReferenceData } from '../lib/markdown/clueReferencer';

import * as prod from 'react/jsx-runtime';
const production = { Fragment: prod.Fragment, jsx: prod.jsx, jsxs: prod.jsxs };

export const Markdown = (props: {
  hast: Root;
  inline?: boolean;
  className?: string;
  noRefs?: boolean;
}) => {
  const hast = props.hast;
  const components: Partial<Components> = {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    p: ({ node, children, ...props }) => {
      return (
        <div className="paragraph" {...props}>
          {children}
        </div>
      );
    },
    span: ({ node, children, className, ...props }) => {
      const ref = node?.data as (ReferenceData & { text: string }) | undefined;
      if (className === 'clueref' && ref !== undefined) {
        return (
          <ClueReference
            key={ref.start}
            text={ref.text}
            direction={ref.direction}
            labelNumber={ref.labelNumber}
          />
        );
      } else if (className === 'spoiler') {
        return <SpoilerText>{children}</SpoilerText>;
      } else if (className === 'no-refs') {
        return (
          <ShowRefsContext.Provider value={false}>
            {children}
          </ShowRefsContext.Provider>
        );
      } else {
        return (
          <span className={className} {...props}>
            {children}
          </span>
        );
      }
    },
  };

  const reactContent = unified()
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    .use(rehypeReact, {
      ...production,
      passNode: true,
      components,
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
