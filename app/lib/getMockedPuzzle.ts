import { Timestamp } from './timestamp';
import { DBPuzzleT } from './dbtypes';

export function getMockedPuzzle(fields?: Partial<DBPuzzleT>): DBPuzzleT {
  const { pv, pvu, ...rest } = fields || {};
  return {
    ...{
      c: null,
      m: false,
      t: 'Raises, as young',
      dn: [1, 2, 3, 4, 5],
      ac: [
        " Cobbler's forms",
        'Absolutely perfect',
        'Spike Lee\'s "She\'s ___ Have It"',
        'English class assignment',
        'Raises, as young',
      ],
      dc: [
        'Hybrid whose father is a lion',
        '___ of reality (wake-up call)',
        '___ date (makes wedding plans)',
        'Middle Ages invader',
        'Has a great night at the comedy club',
      ],
      p: Timestamp.now(),
      a: 'fSEwJorvqOMK5UhNMHa4mu48izl1',
      an: [1, 6, 7, 8, 9],
      g: [
        'L',
        'A',
        'S',
        'T',
        'S',
        'I',
        'D',
        'E',
        'A',
        'L',
        'G',
        'O',
        'T',
        'T',
        'A',
        'E',
        'S',
        'S',
        'A',
        'Y',
        'R',
        'E',
        'A',
        'R',
        'S',
      ],
      h: 5,
      w: 5,
      cs: [
        {
          c: "A couple of two-worders today which I don't love, but I hope you all got it anyway!",
          i: 'LwgoVx0BAskM4wVJyoLj',
          t: 36.009,
          p: Timestamp.now(),
          a: 'fSEwJorvqOMK5UhNMHa4mu48izl1',
          n: 'Mike D',
          ch: false,
        },
      ],
      n: 'Mike D',
    },
    ...rest,
    ...((pvu && { pvu }) || { pv: pv || true }),
  };
}
