import { Text, Element } from 'hast';
import { Plugin } from 'unified';
import { Node } from 'unist';
import { is } from 'unist-util-is';
import { Direction } from '../../lib/types';
import { ClueReferenceData } from '../parse';
import { flatMap } from './utils';

interface EntryReferencerOptions {
  clueMap: Map<string, [number, Direction, string]>;
}

export const entryReferencer: Plugin<[EntryReferencerOptions]> = (options) => {
  if (options.clueMap.size === 0) {
    console.log('No clues? Skipping entryReferencer');
    return (tree) => tree;
  }
  const regex = new RegExp(
    '\\b(' + Array.from(options.clueMap.keys()).join('|') + ')\\b',
    'g'
  );
  return (tree) => {
    flatMap(tree, (node: Node): Node[] => {
      if (
        !is(node, (n): n is Text => {
          return n.type === 'text';
        })
      ) {
        return [node];
      }
      const refs: ClueReferenceData[] = [];
      const value = node.value;
      let match;
      while ((match = regex.exec(value)) !== null) {
        const entry = match[1];
        if (!entry) {
          throw new Error('missing entry');
        }
        const data = options.clueMap.get(entry);
        if (!data) {
          throw new Error('missing data');
        }
        const [labelNumber, direction] = data;

        refs.push({
          direction,
          labelNumber,
          start: match.index,
          end: match.index + match.length,
        });
        const last = refs[refs.length - 1];
        if (last && match[0]) {
          last.end = match.index + match[0].length;
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
