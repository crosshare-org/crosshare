/**
 * @jest-environment node
 */

import { jest } from '@jest/globals';
import type { NextApiRequest, NextApiResponse } from 'next';

const getPuzzle = jest.fn<(id: string) => Promise<unknown>>();

jest.unstable_mockModule('../lib/serverOnly.js', () => ({ getPuzzle }));
jest.unstable_mockModule('../lib/converter.js', () => ({
  exportIpuz: () => new TextEncoder().encode('{}'),
}));

const { default: handler } = await import('../pages/api/ipuz/[puzzleId].js');

function mockResponse() {
  const headers: Record<string, string> = {};
  const res = {
    headers,
    statusCode: 0,
    setHeader: jest.fn((k: string, v: string) => {
      headers[k.toLowerCase()] = v;
    }),
    writeHead: jest.fn((status: number, h: Record<string, string>) => {
      res.statusCode = status;
      for (const [k, v] of Object.entries(h)) {
        headers[k.toLowerCase()] = v;
      }
    }),
    end: jest.fn(),
    status: jest.fn((s: number) => {
      res.statusCode = s;
      return res;
    }),
    json: jest.fn(),
  };
  return res;
}

test('ipuz download is not served as application/json', async () => {
  // Android appends .json to downloads served as application/json, which
  // turns "puzzle.ipuz" into "puzzle.ipuz.json".
  getPuzzle.mockResolvedValue({ id: 'abc', t: 'My Puzzle!' });
  const res = mockResponse();

  await handler(
    { query: { puzzleId: 'abc' } } as unknown as NextApiRequest,
    res as unknown as NextApiResponse
  );

  expect(res.statusCode).toBe(200);
  expect(res.headers['content-type']).toBe('application/octet-stream');
  expect(res.headers['content-disposition']).toBe(
    'inline; filename="My Puzzle.ipuz"'
  );
  expect(res.end).toHaveBeenCalled();
});
