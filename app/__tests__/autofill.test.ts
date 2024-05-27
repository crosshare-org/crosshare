import { Autofiller } from '../lib/Autofiller.js';
import { build } from '../lib/WordDB.js';

test('test basic autofill', async () => {
  await build('AB;1\nAC;1\nBD;1\nCD;1');
  const grid = ['A', 'B', ' ', ' '];
  let callCount = 0;
  let lastResult: string[] = [];
  const onResult = (
    input: [string[], Set<number>, Set<number>],
    result: string[]
  ) => {
    callCount += 1;
    lastResult = result;
    expect(input[0]).toEqual(grid);
  };
  const a = new Autofiller(grid, 2, 2, new Set(), new Set(), onResult, () => {
    /* noop */
  });
  while (!a.completed) {
    a.step();
  }
  expect(callCount).toEqual(1);
  expect(lastResult).toEqual(['A', 'B', 'C', 'D']);
});

test('test unfillable', async () => {
  await build('AB;1\nAC;1\nBD;1\nDC;1');
  const grid = ['A', 'B', ' ', ' '];
  let callCount = 0;
  let lastResult: string[] = [];
  const onResult = (
    input: [string[], Set<number>, Set<number>],
    result: string[]
  ) => {
    callCount += 1;
    lastResult = result;
    expect(input[0]).toEqual(grid);
  };
  const a = new Autofiller(grid, 2, 2, new Set(), new Set(), onResult, () => {
    /* noop */
  });
  while (!a.completed) {
    a.step();
  }
  expect(callCount).toEqual(0);
  expect(lastResult).toEqual([]);
});

test('test unfillable is fillable with the right bars', async () => {
  await build('AB;1\nAC;1\nBD;1\nDC;1');
  const grid = ['A', 'B', ' ', ' '];
  let callCount = 0;
  let lastResult: string[] = [];
  const onResult = (
    input: [string[], Set<number>, Set<number>],
    result: string[]
  ) => {
    callCount += 1;
    lastResult = result;
    expect(input[0]).toEqual(grid);
  };
  const a = new Autofiller(
    grid,
    2,
    2,
    new Set([2]),
    new Set(),
    onResult,
    () => {
      /* noop */
    }
  );
  while (!a.completed) {
    a.step();
  }
  expect(callCount).toEqual(1);
  expect(lastResult).toEqual(['A', 'B', 'C', 'D']);
});

test('test no repeats', async () => {
  await build('AB;1\nBC;1\nBD;1\nDC;1');
  const grid = ['A', 'B', ' ', ' '];
  let callCount = 0;
  let lastResult: string[] = [];
  const onResult = (
    input: [string[], Set<number>, Set<number>],
    result: string[]
  ) => {
    callCount += 1;
    lastResult = result;
    expect(input[0]).toEqual(grid);
  };
  const a = new Autofiller(grid, 2, 2, new Set(), new Set(), onResult, () => {
    /* noop */
  });
  while (!a.completed) {
    a.step();
  }
  expect(callCount).toEqual(0);
  expect(lastResult).toEqual([]);
});

test('test no repeats 2', async () => {
  await build('AB;1\nBC;1\nBD;1\nDC;1');
  const grid = ['A', ' ', ' ', ' '];
  let callCount = 0;
  let lastResult: string[] = [];
  const onResult = (
    input: [string[], Set<number>, Set<number>],
    result: string[]
  ) => {
    callCount += 1;
    lastResult = result;
    expect(input[0]).toEqual(grid);
  };
  const a = new Autofiller(grid, 2, 2, new Set(), new Set(), onResult, () => {
    /* noop */
  });
  while (!a.completed) {
    a.step();
  }
  expect(callCount).toEqual(0);
  expect(lastResult).toEqual([]);
});
