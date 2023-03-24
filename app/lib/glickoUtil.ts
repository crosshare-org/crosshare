export const INITIAL_RATING = 1500;
export const INITIAL_RD = 350;
export const Q = 0.0057565;
export const Q_SQ = Q * Q;
const PI_SQ = Math.PI * Math.PI;

interface GlickoScore {
  r: number;
  d: number;
  u: number;
}

export function gFunc(rd: number) {
  return 1 / Math.sqrt(1 + (3 * Q_SQ * rd * rd) / PI_SQ);
}

export function expectedOutcome(
  g: number,
  rating: number,
  oppRating: number
): number {
  return 1 / (1 + Math.pow(10, (-g * (rating - oppRating)) / 400));
}

export function twoPlayerExpectation(p1: GlickoScore, p2: GlickoScore) {
  const g = gFunc(Math.sqrt(p1.d * p1.d + p2.d * p2.d));
  return expectedOutcome(g, p1.r, p2.r);
}
