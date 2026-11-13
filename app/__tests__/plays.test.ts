import { PlayWithoutUserT } from '../lib/dbtypes.js';
import {
  cachePlay,
  getPlayFromCache,
  isDirty,
  reconcilePlayFromDB,
  resetMemoryStore,
} from '../lib/plays.js';
import { getUser } from '../lib/testingUtils.js';
import { Timestamp } from '../lib/timestamp.js';

const user = getUser('reconcile-user', false);

function getPlay(
  puzzleId: string,
  updatedAt: number,
  overrides?: Partial<PlayWithoutUserT>
): PlayWithoutUserT {
  return {
    c: puzzleId,
    n: 'Test puzzle',
    ua: Timestamp.fromMillis(updatedAt),
    g: ['A', ' ', ' ', ' '],
    ct: [1, 0, 0, 0],
    uc: [1, 0, 0, 0],
    vc: [],
    wc: [],
    we: [],
    rc: [],
    t: 5,
    ch: false,
    f: false,
    ...overrides,
  };
}

// Cache a play and then drop the in-memory copy, as happens on a page refresh
function cacheAndRefresh(puzzleId: string, play: PlayWithoutUserT) {
  cachePlay(user, puzzleId, play, true);
  resetMemoryStore();
}

beforeEach(() => {
  localStorage.clear();
  resetMemoryStore();
});

test('uses the db play when nothing is cached', () => {
  const dbPlay = getPlay('nocache', 1000);
  expect(reconcilePlayFromDB(user, 'nocache', dbPlay)).toEqual(dbPlay);
  expect(getPlayFromCache(user, 'nocache')).toEqual(dbPlay);
  expect(isDirty(user, 'nocache')).toBe(false);

  expect(reconcilePlayFromDB(user, 'nocache-nodb', null)).toBeNull();
  expect(isDirty(user, 'nocache-nodb')).toBe(false);
});

test('uses the cached play when the db write was lost', () => {
  const cached = getPlay('nodb', 2000);
  cacheAndRefresh('nodb', cached);

  expect(reconcilePlayFromDB(user, 'nodb', null)?.g).toEqual(cached.g);
  expect(getPlayFromCache(user, 'nodb')?.g).toEqual(cached.g);
  expect(isDirty(user, 'nodb')).toBe(true);
});

test('uses the cached play when it is newer than the db play', () => {
  const cached = getPlay('stale-db', 2000, { g: ['A', 'B', ' ', ' '] });
  cacheAndRefresh('stale-db', cached);

  const res = reconcilePlayFromDB(user, 'stale-db', getPlay('stale-db', 1000));
  expect(res?.g).toEqual(cached.g);
  expect(isDirty(user, 'stale-db')).toBe(true);
});

test('uses the db play when it is newer than the cached play', () => {
  cacheAndRefresh('stale-cache', getPlay('stale-cache', 1000));

  const dbPlay = getPlay('stale-cache', 2000, { g: ['A', 'B', 'C', ' '] });
  expect(reconcilePlayFromDB(user, 'stale-cache', dbPlay)).toEqual(dbPlay);
  expect(getPlayFromCache(user, 'stale-cache')?.g).toEqual(dbPlay.g);
  expect(isDirty(user, 'stale-cache')).toBe(false);
});

test('uses the db play when both were updated at the same time', () => {
  const play = getPlay('in-sync', 1000);
  cacheAndRefresh('in-sync', play);

  expect(reconcilePlayFromDB(user, 'in-sync', play)).toEqual(play);
  expect(isDirty(user, 'in-sync')).toBe(false);
});

test('a finished db play beats a newer unfinished cached play', () => {
  cacheAndRefresh('finished', getPlay('finished', 2000));

  const dbPlay = getPlay('finished', 1000, {
    g: ['A', 'B', 'C', 'D'],
    f: true,
  });
  expect(reconcilePlayFromDB(user, 'finished', dbPlay)).toEqual(dbPlay);
  expect(getPlayFromCache(user, 'finished')?.f).toBe(true);
  expect(isDirty(user, 'finished')).toBe(false);
});

test('an unstarted cached play is restored but not sent to the db', () => {
  const cached = getPlay('unstarted', 2000, { t: 0.5 });
  cacheAndRefresh('unstarted', cached);

  expect(reconcilePlayFromDB(user, 'unstarted', null)?.g).toEqual(cached.g);
  expect(isDirty(user, 'unstarted')).toBe(false);
});

test("doesn't use a play cached for a different user", () => {
  cachePlay(
    getUser('other-user', false),
    'other',
    getPlay('other', 2000),
    true
  );
  resetMemoryStore();

  expect(reconcilePlayFromDB(user, 'other', null)).toBeNull();
  expect(isDirty(user, 'other')).toBe(false);
});
