import { Plugin } from 'unified';
import { findAndReplace, PhrasingContent } from 'mdast-util-find-and-replace';

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

function replaceMention(
  value: string,
  username: string
): PhrasingContent | string | false {
  const url = `/${username}`;
  return {
    type: 'link',
    title: null,
    url,
    children: [{ type: 'text', value }],
  };
}

function replaceTag(
  value: string,
  tag: string
): PhrasingContent | string | false {
  const url = `/tags/${tag}`;
  return {
    type: 'link',
    title: null,
    url,
    children: [{ type: 'text', value }],
  };
}
