import { spoilersSyntax } from './micromark-extension-spoilers';
import { fromMarkdownExtension } from './mdast-util-spoilers';
import { Plugin, Processor } from 'unified';

export const remarkSpoilers: Plugin = function (this: Processor) {
  const data = this.data();

  const micromarkExtensions =
    data.micromarkExtensions ?? (data.micromarkExtensions = []);
  const fromMarkdownExtensions =
    data.fromMarkdownExtensions ?? (data.fromMarkdownExtensions = []);

  micromarkExtensions.push(spoilersSyntax());
  fromMarkdownExtensions.push(fromMarkdownExtension);
};
