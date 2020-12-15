import * as t from 'io-ts';

import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';

const EmbedOptionsV = t.partial({
  /** primary color */
  p: t.string,
  /** use dark theme? */
  d: t.boolean,
});

export type EmbedOptionsT = t.TypeOf<typeof EmbedOptionsV>;

export function validate(eo: unknown): EmbedOptionsT | null {
  const validationResult = EmbedOptionsV.decode(eo);
  if (isRight(validationResult)) {
    return validationResult.right;
  } else {
    console.error(PathReporter.report(validationResult).join(','));
    return null;
  }
}
