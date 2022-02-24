import { spoilersSyntax } from './micromark-extension-spoilers';
import { fromMarkdownExtension } from './mdast-util-spoilers';

export function remarkSpoilers(this: any) {
  const data = this.data();

  add('micromarkExtensions', spoilersSyntax());
  add('fromMarkdownExtensions', fromMarkdownExtension);

  function add(field: string, value: any) {
    const list = data[field] ? data[field] : (data[field] = []);
    list.push(value);
  }
}
