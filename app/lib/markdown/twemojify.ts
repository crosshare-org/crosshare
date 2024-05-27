import { Text } from 'hast';
import { parse } from 'twemoji-parser';
import { Plugin } from 'unified';
import { Node } from 'unist';
import { is } from 'unist-util-is';
import { flatMap } from './utils.js';

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
      const emoji = parse(value, {
        buildUrl: (codepoints) =>
          `https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/72x72/${codepoints}.png`,
      });
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
