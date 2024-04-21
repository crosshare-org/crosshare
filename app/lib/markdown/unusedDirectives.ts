/**
 * Based on code from Docusaurus, copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license.
 */
import type { Directives, TextDirective } from 'mdast-util-directive';
import { Plugin } from 'unified';
import type { Transformer, Processor, Parent } from 'unified';
import type { Node } from 'unist';
import { visit } from 'unist-util-visit';

// @ts-expect-error: TODO see https://github.com/microsoft/TypeScript/issues/49721

type DirectiveType = Directives['type'];

const directiveTypes: DirectiveType[] = [
  'containerDirective',
  'leafDirective',
  'textDirective',
];

function isTextDirective(directive: Directives): directive is TextDirective {
  return directive.type === 'textDirective';
}

// A simple text directive is one without any label/props
function isSimpleTextDirective(
  directive: Directives
): directive is TextDirective {
  if (isTextDirective(directive)) {
    // Attributes in MDAST = Directive props
    const hasAttributes =
      directive.attributes && Object.keys(directive.attributes).length > 0;
    // Children in MDAST = Directive label
    const hasChildren = directive.children.length > 0;
    return !hasAttributes && !hasChildren;
  }
  return false;
}

function transformNode<NewNode extends Node>(
  node: Node,
  newNode: NewNode
): NewNode {
  Object.keys(node).forEach((key) => {
    // @ts-expect-error: unsafe but ok
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete node[key];
  });
  Object.keys(newNode).forEach((key) => {
    // @ts-expect-error: unsafe but ok
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    node[key] = newNode[key];
  });
  return node as NewNode;
}

function transformSimpleTextDirectiveToString(textDirective: Directives) {
  transformNode(textDirective, {
    type: 'text',
    value: `:${textDirective.name}`, // We ignore label/props on purpose here
  });
}

function isUnusedDirective(directive: Directives) {
  // If directive data is set (notably hName/hProperties set by admonitions)
  // this usually means the directive has been handled by another plugin
  return !directive.data;
}

const plugin: Plugin = function plugin(this: Processor): Transformer {
  return (tree) => {
    visit<Parent, DirectiveType[]>(
      tree,
      directiveTypes,
      (directive: Directives) => {
        if (isUnusedDirective(directive)) {
          if (isSimpleTextDirective(directive)) {
            transformSimpleTextDirectiveToString(directive);
          }
        }
      }
    );
  };
};

export default plugin;
