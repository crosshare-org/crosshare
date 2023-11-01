import { Plugin, Processor } from 'unified';

export const inlineOnly: Plugin = function (this: Processor) {
  const data = this.data();

  const micromarkExtensions =
    data.micromarkExtensions ?? (data.micromarkExtensions = []);

  // https://github.com/micromark/micromark/blob/main/packages/micromark/dev/lib/constructs.js#L5
  micromarkExtensions.push({ disable: { null: ['list'] } });
};
