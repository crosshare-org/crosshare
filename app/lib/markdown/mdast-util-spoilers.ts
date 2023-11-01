import { Extension } from 'mdast-util-from-markdown';
import { Handle, Parent } from 'mdast-util-from-markdown/lib';

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
