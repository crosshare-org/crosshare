export function sizeTag(size: number): string {
  if (size < 50) {
    return 'mini';
  } else if (size < 12 * 12) {
    return 'midi';
  } else if (size < 17 * 17) {
    return 'full';
  } else {
    return 'jumbo';
  }
}
