import { Plugin, Processor } from 'unified';
import { fromMarkdownExtension } from './mdast-util-spoilers';
import { spoilersSyntax } from './micromark-extension-spoilers';

export const remarkSpoilers: Plugin = function (this: Processor) {
  const data = this.data();

  const micromarkExtensions =
    data.micromarkExtensions ?? (data.micromarkExtensions = []);
  const fromMarkdownExtensions =
    data.fromMarkdownExtensions ?? (data.fromMarkdownExtensions = []);

  micromarkExtensions.push(spoilersSyntax());
  fromMarkdownExtensions.push(fromMarkdownExtension);
};
