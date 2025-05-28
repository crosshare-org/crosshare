import { Nodes } from 'mdast';
import { Replace, findAndReplace } from 'mdast-util-find-and-replace';
import { Plugin } from 'unified';

export const mentionsAndTags: Plugin = () => {
  return (tree: Nodes) => {
    findAndReplace(
      tree,
      [
        [/(^|\s)@([a-z]\w+)\b/gi, replaceMention],
        [/(^|\s)#([a-z][a-z0-9-]{2,})\b/gi, replaceTag],
      ],
      {
        ignore: ['link', 'linkReference'],
      }
    );
  };
};

const replaceMention: Replace = (
  _value: string,
  preText: string,
  username: string
) => {
  const url = `/${username}`;
  return [
    { type: 'text', value: preText },
    {
      type: 'link',
      title: null,
      url,
      children: [{ type: 'text', value: `@${username}` }],
    },
  ];
};

const replaceTag: Replace = (_value: string, preText: string, tag: string) => {
  const url = `/tags/${tag}`;
  return [
    { type: 'text', value: preText },
    {
      type: 'link',
      title: null,
      url,
      children: [{ type: 'text', value: `#${tag}` }],
    },
  ];
};
