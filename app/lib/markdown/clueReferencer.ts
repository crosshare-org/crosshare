import { Plugin } from 'unified';

import { Direction } from '../../lib/types';
import { Node } from 'unist';
import { Text, Element } from 'hast';
import { is } from 'unist-util-is';
import { flatMap } from './utils';

interface ReferenceData {
  direction: Direction;
  labelNumber: number;
  start: number;
  end: number;
}

export const clueReferencer: Plugin = () => {
  return (tree) => {
    flatMap(tree, (node: Node): Node[] => {
      if (!is<Text>(node, 'text')) {
        return [node];
      }
      const value = node.value;
      const refs: Array<ReferenceData> = [];
      let match;
      const re =
        /(^|\s|\/)(?<numSection>(,? ?(and)? ?\b\d+-? ?)+)(?<dir>a(cross(es)?)?|d(owns?)?)\b/gi;
      while ((match = re.exec(value)) !== null) {
        const preLength = match[1]?.length || 0;
        const dirString = match.groups?.dir?.toLowerCase();
        if (!dirString) {
          throw new Error('missing dir string');
        }
        const direction = dirString.startsWith('a')
          ? Direction.Across
          : Direction.Down;
        const numSection = match.groups?.numSection;
        if (!numSection) {
          throw new Error('missing numSection');
        }
        let numMatch: RegExpExecArray | null;
        const numRe = /\d+/g;
        while ((numMatch = numRe.exec(numSection)) !== null && numMatch[0]) {
          const labelNumber = parseInt(numMatch[0]);
          refs.push({
            direction,
            labelNumber,
            start: match.index + numMatch.index + preLength,
            end: match.index + numMatch.index + numMatch[0].length + preLength,
          });
        }
        const last = refs[refs.length - 1];
        if (last && match[0]) {
          last['end'] = match.index + match[0].length;
        }
      }
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
