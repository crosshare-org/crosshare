import * as t from 'io-ts';
import { LruCache } from '../lib/lruCache';

test('lru cache base', () => {
  localStorage.clear();

  const cache = new LruCache('test-cache', 3, t.number);
  cache.set('a', 1);
  cache.set('b', 2);
  cache.set('c', 3);
  cache.set('d', 4);

  expect(cache.get('a')).toBeUndefined();
  expect(cache.get('b')).toEqual(2);
});

test('lru cache get resets', () => {
  localStorage.clear();

  const cache = new LruCache('test-cache', 3, t.number);
  cache.set('a', 1);
  cache.set('b', 2);
  cache.set('c', 3);
  expect(cache.get('a')).toEqual(1);
  cache.set('d', 4);

  expect(cache.get('b')).toBeUndefined();
  expect(cache.get('a')).toEqual(1);
});

test('lru cache persistance', () => {
  localStorage.clear();

  const cache = new LruCache('test-cache', 3, t.number);
  cache.set('a', 1);
  cache.set('b', 2);
  cache.set('c', 3);
  expect(cache.get('a')).toEqual(1);
  cache.set('d', 4);

  const cache2 = new LruCache('test-cache', 3, t.number);

  expect(cache2.get('b')).toBeUndefined();
  expect(cache2.get('a')).toEqual(1);

  const cache3 = new LruCache('test-cache1', 3, t.number);

  expect(cache3.get('b')).toBeUndefined();
  expect(cache3.get('a')).toBeUndefined();
});
