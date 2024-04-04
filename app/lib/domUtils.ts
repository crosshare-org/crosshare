export function isTextInput(target: EventTarget | null): boolean {
  const tagName = (target as HTMLElement | null)?.tagName.toLowerCase();
  return tagName === 'textarea' || tagName === 'input';
}
