import { Parent } from 'mdast';
import { Extension, Handle } from 'mdast-util-from-markdown';

export interface Spoiler extends Parent {
  type: 'spoiler';
}

declare module 'mdast' {
  interface RootContentMap {
    spoiler: Spoiler;
  }
}
const enterSpoiler: Handle = function (this, token) {
  this.enter({ type: 'spoiler', children: [] }, token);
};

const exitSpoiler: Handle = function (this, token) {
  this.exit(token);
};

export const fromMarkdownExtension: Extension = {
  // canContainEols: ['spoiler'],
  enter: { spoiler: enterSpoiler },
  exit: { spoiler: exitSpoiler },
};
