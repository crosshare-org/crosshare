import { Plugin } from 'unified';
import { parse } from 'twemoji-parser';
import { Node } from 'unist';
import { Text } from 'hast';
import { is } from 'unist-util-is';
import { flatMap } from './utils';

export const twemojify: Plugin = () => {
  return (tree) => {
    flatMap(tree, (node: Node) => {
      if (
        !is(node, (n): n is Text => {
          return n.type === 'text';
        })
      ) {
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
