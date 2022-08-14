import { spoilersSyntax } from './micromark-extension-spoilers';
import { fromMarkdownExtension } from './mdast-util-spoilers';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function remarkSpoilers(this: any) {
  const data = this.data();

  add('micromarkExtensions', spoilersSyntax());
  add('fromMarkdownExtensions', fromMarkdownExtension);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function add(field: string, value: any) {
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    const list = data[field] ? data[field] : (data[field] = []);
    list.push(value);
  }
}
