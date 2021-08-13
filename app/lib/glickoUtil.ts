export const INITIAL_RATING = 1500;
export const INITIAL_RD = 350;
export const Q = 0.0057565;
export const Q_SQ = Q * Q;
const PI_SQ = Math.PI * Math.PI;

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
