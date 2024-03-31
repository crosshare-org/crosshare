import { Plugin } from 'unified';

import { Node } from 'unist';
import { Text, Element } from 'hast';
import { is } from 'unist-util-is';
import { flatMap } from './utils';
import { parseClueReferences } from '../parse';

export const clueReferencer: Plugin = () => {
  return (tree) => {
    flatMap(tree, (node: Node): Node[] => {
      if (
        !is(node, (n): n is Text => {
          return n.type === 'text';
        })
      ) {
        return [node];
      }
      const value = node.value;
      const refs = parseClueReferences(value);
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
          data: { ...ref, text },
          properties: {
            className: 'clueref',
          },
          children: [{ type: 'text', value: text }],
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
