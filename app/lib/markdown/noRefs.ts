import { Plugin } from 'unified';
import { visit } from 'unist-util-visit';

export const remarkNoRefs: Plugin = () => {
  return (tree) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    visit(tree, (node: any) => {
      if (
        node.type !== 'textDirective' ||
        node.name !== 'no-refs'
      ) {
        return;
      }
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      const data = node.data || (node.data = {});
      data.hName = 'span';
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      const properties = data.hProperties || (data.hProperties = {});
      properties.className = 'no-refs';
    });
  };
};
