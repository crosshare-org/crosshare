// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function inlineOnly(this: any) {
  const data = this.data();

  // https://github.com/micromark/micromark/blob/main/packages/micromark/dev/lib/constructs.js#L5
  add('micromarkExtensions', {disable: {null: ['list']}});
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function add(field: string, value: any) {
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    const list = data[field] ? data[field] : (data[field] = []);
    list.push(value);
  }
};
