import { Plugin, Processor } from 'unified';
import { fromMarkdownExtension } from './mdast-util-spoilers.js';
import { spoilersSyntax } from './micromark-extension-spoilers.js';

export const remarkSpoilers: Plugin = function (this: Processor) {
  const data = this.data();

  const micromarkExtensions =
    data.micromarkExtensions ?? (data.micromarkExtensions = []);
  const fromMarkdownExtensions =
    data.fromMarkdownExtensions ?? (data.fromMarkdownExtensions = []);

  micromarkExtensions.push(spoilersSyntax());
  fromMarkdownExtensions.push(fromMarkdownExtension);
};
