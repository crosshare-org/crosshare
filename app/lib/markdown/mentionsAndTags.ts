import { Plugin } from 'unified';
import { findAndReplace, Replace } from 'mdast-util-find-and-replace';

export const mentionsAndTags: Plugin = () => {
  return (tree) => {
    findAndReplace(
      tree as any,
      [
        [/(?<=^|\s)@([a-z]\w+)\b/gi, replaceMention],
        [/(?<=^|\s)#([a-z][a-z0-9-]{2,})\b/gi, replaceTag],
      ],
      {
        ignore: ['link', 'linkReference'],
      }
    );
  };
};

let replaceMention: Replace = (value: string, username: string) => {
  const url = `/${username}`;
  return {
    type: 'link',
    title: null,
    url,
    children: [{ type: 'text', value }],
  };
};

const replaceTag: Replace = (value: string, tag: string) => {
  const url = `/tags/${tag}`;
  return {
    type: 'link',
    title: null,
    url,
    children: [{ type: 'text', value }],
  };
};
