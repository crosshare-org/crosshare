import * as t from 'io-ts';
import { either } from 'fp-ts/lib/Either';

export class Timestamp {
  constructor(private millis: number) {}

  toMillis() {
    return this.millis;
  }

  toDate() {
    return new Date(this.millis);
  }

  toJSON() {
    return {
      nanoseconds: (this.millis % 1000) * 1000,
      seconds: Math.floor(this.millis / 1000),
    };
  }

  /**
   * Converts this object to a primitive string, which allows `Timestamp` objects
   * to be compared using the `>`, `<=`, `>=` and `>` operators.
   */
  valueOf(): string {
    return String(this.millis).padStart(21, '0');
  }

  static now() {
    return new this(Date.now());
  }

  static fromDate(d: Date) {
    return new this(d.getTime());
  }

  static fromMillis(n: number) {
    return new this(n);
  }
}

export const isTimestamp = (u: unknown): u is Timestamp =>
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
  u ? (u as Timestamp).toMillis !== undefined : false;

const validateTimestamp: t.Validate<unknown, Timestamp> = (i, c) => {
  if (isTimestamp(i)) {
    return t.success(new Timestamp(i.toMillis()));
  }
  return either.chain(
    t.type({ seconds: t.number, nanoseconds: t.number }).validate(i, c),
    (obj) =>
      t.success(new Timestamp(obj.seconds * 1000 + obj.nanoseconds / 1000))
  );
};

export const timestamp = new t.Type<Timestamp, Timestamp, unknown>(
  'Timestamp',
  isTimestamp,
  validateTimestamp,
  t.identity
);
