// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function inlineOnly(this: any) {
  const data = this.data();

  add('micromarkExtensions', {disable: {null: ['list']}});
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function add(field: string, value: any) {
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    const list = data[field] ? data[field] : (data[field] = []);
    list.push(value);
  }
};
