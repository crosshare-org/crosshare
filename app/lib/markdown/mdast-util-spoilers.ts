/* eslint-disable @typescript-eslint/no-explicit-any */
import { Extension } from 'mdast-util-from-markdown';

const enterSpoiler = function (this: any, token: any) {
  this.enter({ type: 'spoiler', children: [] }, token);
};

const exitSpoiler = function (this: any, token: any) {
  this.exit(token);
};

export const fromMarkdownExtension: Extension = {
  // canContainEols: ['spoiler'],
  enter: { spoiler: enterSpoiler },
  exit: { spoiler: exitSpoiler },
};
