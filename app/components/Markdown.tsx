import { ClueReference } from './ClueReference';
import { SpoilerText } from './SpoilerText';
import { ShowRefsContext } from './ShowRefsContext';
import rehypeReact from 'rehype-react';
import { unified } from 'unified';
import { createElement, Fragment } from 'react';
import type { Root } from 'hast';

export const Markdown = (props: {
  hast: Root;
  inline?: boolean;
  className?: string;
  noRefs?: boolean;
}) => {
  const hast = props.hast;
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
          } else if (className === 'no-refs') {
            return <ShowRefsContext.Provider value={false}>
              {children}
            </ShowRefsContext.Provider>;
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
