import { Node, Parent } from 'unist';
import { is } from 'unist-util-is';

export function flatMap(ast: Node | Parent, fn: (x: Node) => Node[]) {
  return transform(ast)[0];

  function transform(node: Node | Parent) {
    if (is(node, (node: Node): node is Parent => 'children' in node)) {
      const out: Node[] = [];
      for (const child of node.children) {
        const xs = transform(child);
        if (xs.length) {
          out.push(...xs);
        }
      }
      node.children = out;
    }

    return fn(node);
  }
}
