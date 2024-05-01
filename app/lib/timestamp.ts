import * as t from 'io-ts';

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
  const res = t
    .type({ seconds: t.number, nanoseconds: t.number })
    .validate(i, c);
  if (res._tag === 'Right') {
    return t.success(
      new Timestamp(res.right.seconds * 1000 + res.right.nanoseconds / 1000)
    );
  }
  return t.failure(i, c);
};

export const timestamp = new t.Type<Timestamp, Timestamp, unknown>(
  'Timestamp',
  isTimestamp,
  validateTimestamp,
  t.identity
);
