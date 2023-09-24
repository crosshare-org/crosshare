#!/usr/bin/env -S NODE_OPTIONS='--loader ts-node/esm --experimental-specifier-resolution=node' npx ts-node-script

import { promises as fs } from 'fs';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';

import { unified } from 'unified';

import { Plugin } from 'unified';
import { visit } from 'unist-util-visit';
import { Node } from 'unist';
import type { Visitor } from 'unist-util-visit';

type LinkNode = {
  url: string;
} & Node;

const linksForEmail: Plugin = () => {
  const visitor: Visitor<LinkNode> = (node) => {
    const url = new URL(node.url, 'https://crosshare.org');
    if (url.hostname !== 'crosshare.org') {
      return;
    }
    url.searchParams.set('utm_source', 'mailchimp');
    url.searchParams.set('utm_medium', 'email');
    url.searchParams.set('utm_campaign', 'weekly');
    node.url = url.toString();
  };
  return (tree) => visit(tree, 'link', visitor);
};

if (process.argv.length !== 2) {
  throw Error(
    'Invalid use of finalizeEmail. Usage: ./scripts/finalizeEmail.ts'
  );
}

async function finalizeEmail() {
  fs.readFile('email.txt').then((binary) => {
    unified()
      .use(remarkParse)
      .use(linksForEmail)
      .use(remarkRehype)
      .use(rehypeStringify)
      .process(binary, (err, file) => {
        if (err) throw err;
        console.log(String(file));
        return undefined;
      });
  });
}

finalizeEmail().then(() => {
  console.log('Done');
});
